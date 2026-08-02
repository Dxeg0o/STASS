// Evaluacion de cambios de lote mal hechos en ORIN-AGX-2 (Pelchuquin).
//
// Al cambiar de lote deberia haber >= 3 min de pausa para limpiar la linea.
// Este script es READ-ONLY: detecta transiciones entre lote_session
// consecutivas del mismo dispositivo con lote_id distinto, mide la pausa
// real usando conteo (verdad de terreno, no lote_session) y cruza señales
// de continuidad de flujo + distribucion de calibre (perimeter) para
// asignar un puntaje de confianza 0-100 de que el cambio fue mal hecho
// (linea nunca se detuvo / producto mezclado).
//
// Batcheado: en vez de ~7 queries por transicion (miles de round-trips),
// se hacen 2 queries masivas con VALUES+JOIN (una por bordes de conteo, otra
// por ventana de datos alrededor de cada cambio) para tolerar latencia alta
// de red hacia la BD.
//
//   node scripts/eval-cambios-lote.mjs                 # AGX-2, gap=180s
//   node scripts/eval-cambios-lote.mjs --gap=120
//   node scripts/eval-cambios-lote.mjs --device=<uuid|nombre>
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import postgres from "postgres";

config({ path: ".env.local" });

const DEFAULT_DEVICE = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2
const OUT = path.resolve("../outputs/eval_cambios_lote");

const gapArg = (process.argv.find(a => a.startsWith("--gap=")) || "").split("=")[1];
const GAP_S = gapArg ? Number(gapArg) : 180; // 3 min
const deviceArg = (process.argv.find(a => a.startsWith("--device=")) || "").split("=")[1];

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
const sql = postgres(cs, { max: 1, idle_timeout: 20, connect_timeout: 15 });

const MARGIN_MIN = 10; // ventana +- alrededor del cambio real, para flujo/interleave/calibre
const FLOW_MIN = 2;
const EARLY_N = 200;
const SAMPLE_CAP = 1500;

// ── utilidades ──────────────────────────────────────────────────────────────
function tvd(histA, histB, bins) {
  const totA = bins.reduce((s, b) => s + (histA.get(b) || 0), 0) || 1;
  const totB = bins.reduce((s, b) => s + (histB.get(b) || 0), 0) || 1;
  let d = 0;
  for (const b of bins) d += Math.abs((histA.get(b) || 0) / totA - (histB.get(b) || 0) / totB);
  return d / 2; // 0 = identicas, 1 = disjuntas
}
function histOf(rows, binSize = 0.5) {
  const h = new Map();
  for (const r of rows) {
    if (r.perimeter == null) continue;
    const b = Math.round(r.perimeter / binSize) * binSize;
    h.set(b, (h.get(b) || 0) + 1);
  }
  return h;
}
function allBins(...hists) {
  const s = new Set();
  for (const h of hists) for (const k of h.keys()) s.add(k);
  return [...s];
}
const iso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

async function main() {
  mkdirSync(OUT, { recursive: true });

  let device = DEFAULT_DEVICE;
  if (deviceArg) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(deviceArg);
    const d = await sql`select id from dispositivo where ${isUuid ? sql`id = ${deviceArg}` : sql`nombre = ${deviceArg}`}`;
    if (!d.length) throw new Error(`Dispositivo no encontrado: ${deviceArg}`);
    device = d[0].id;
  }
  const dInfo = await sql`select nombre from dispositivo where id = ${device}`;
  const deviceName = dInfo[0]?.nombre ?? device;

  console.log(`eval-cambios-lote | device=${deviceName} (${device}) | umbral pausa=${GAP_S}s | margen ventana=${MARGIN_MIN}min`);
  await sql`set statement_timeout = '170s'`;

  // ── 1. Sesiones (solo para contexto/comparacion, no son la fuente de verdad) ──
  console.log("\n[1] Cargando lote_session y detectando transiciones (cambio de lote_id entre sesiones consecutivas)");
  const sessions = await sql`
    select ls.id, ls.lote_id, lo.codigo_lote, ls.start_time, ls.end_time
    from lote_session ls join lote lo on lo.id = ls.lote_id
    where ls.dispositivo_id = ${device}
    order by ls.start_time`;

  const transitions = [];
  for (let i = 0; i < sessions.length - 1; i++) {
    const prev = sessions[i], next = sessions[i + 1];
    if (prev.lote_id === next.lote_id) continue;
    transitions.push({ idx: transitions.length, prev, next });
  }
  console.log(`  ${sessions.length} sesiones, ${transitions.length} transiciones con cambio de lote`);

  // ── 2. Query batcheada: bordes reales via ORDER BY ts LIMIT 1 (no MAX/MIN con rango
  // ancho: el end_time de lote_session esta inflado en este dispositivo -- documentado en
  // memoria -- y un agregado MAX/MIN con predicado de rango fuerza escanear ese rango
  // entero, que puede cubrir semanas. ORDER BY ts DESC/ASC LIMIT 1 SI usa el indice
  // (lote_id, ts) para parar en la primera fila, sin importar el ancho del rango).
  // Se usa next.start_time (confiable) +- margen de seguridad como cota, no next.end_time.
  console.log("\n[2] Query batcheada: bordes de conteo (ultimo del lote anterior / primero del nuevo, index-seek)");
  const MARGIN_SAFETY = "2 days";
  const valsA = transitions.map(t => {
    const ns = iso(t.next.start_time);
    return `(${t.idx}, '${t.prev.lote_id}'::uuid, '${t.next.lote_id}'::uuid, '${ns}'::timestamptz)`;
  }).join(",\n");

  const boundaries = await sql`
    with t(idx, prev_lote, next_lote, ns) as (values ${sql.unsafe(valsA)})
    select t.idx::int,
      (select c.ts from conteo c where c.dispositivo_id=${device} and c.lote_id=t.prev_lote
         and c.ts < t.ns + interval '${sql.unsafe(MARGIN_SAFETY)}'
         order by c.ts desc limit 1) as ts_prev,
      (select c.ts from conteo c where c.dispositivo_id=${device} and c.lote_id=t.next_lote
         and c.ts >= t.ns - interval '${sql.unsafe(MARGIN_SAFETY)}'
         order by c.ts asc limit 1) as ts_next
    from t order by t.idx`;
  const boundaryByIdx = new Map(boundaries.map(b => [b.idx, b]));
  console.log(`  ${boundaries.length} filas de bordes`);

  // ── 3. Query batcheada B: ventana de datos alrededor de cada cambio real ──
  console.log(`\n[3] Query batcheada: hasta ${EARLY_N + SAMPLE_CAP} conteos del lote nuevo / ${SAMPLE_CAP} del anterior por transicion`);
  const evaluables = transitions.filter(t => boundaryByIdx.get(t.idx)?.ts_prev && boundaryByIdx.get(t.idx)?.ts_next);
  console.log(`  ${evaluables.length}/${transitions.length} transiciones con bordes de conteo encontrados`);
  const valsB = evaluables.map(t => {
    const b = boundaryByIdx.get(t.idx);
    const center = iso(b.ts_next);
    return `(${t.idx}, '${t.prev.lote_id}'::uuid, '${t.next.lote_id}'::uuid, '${center}'::timestamptz)`;
  }).join(",\n");

  // LIMIT acotado por cantidad (no por rango de tiempo): estos lotes son muy densos
  // (~340 conteos/min), asi que un rango +-10min podia traer millones de filas y
  // colgar la query (Bitmap scan mal estimado sobre parametros correlacionados).
  // ORDER BY ts (asc/desc) + LIMIT SI usa el indice (lote_id, ts) como index-seek,
  // igual que la query de bordes, sin importar la densidad real de datos.
  const NEXT_LIMIT = EARLY_N + SAMPLE_CAP;
  const PREV_LIMIT = SAMPLE_CAP;
  const windowRows = evaluables.length ? await sql`
    with t(idx, prev_lote, next_lote, center) as (values ${sql.unsafe(valsB)})
    select t.idx::int, w.ts, w.lote_id, w.perimeter
    from t, lateral (
      (select c.ts, c.lote_id, c.perimeter from conteo c
       where c.lote_id = t.next_lote and c.ts >= t.center
       order by c.ts asc limit ${NEXT_LIMIT})
      union all
      (select c.ts, c.lote_id, c.perimeter from conteo c
       where c.lote_id = t.prev_lote and c.ts < t.center
       order by c.ts desc limit ${PREV_LIMIT})
    ) w
    order by t.idx, w.ts` : [];
  console.log(`  ${windowRows.length} filas de conteo en ventanas`);

  const windowByIdx = new Map();
  for (const r of windowRows) {
    if (!windowByIdx.has(r.idx)) windowByIdx.set(r.idx, []);
    windowByIdx.get(r.idx).push(r);
  }

  // ── 4. Computo en memoria por transicion ──────────────────────────────────
  console.log("\n[4] Calculando señales y puntaje por transicion");
  const results = [];
  for (const t of transitions) {
    const { prev, next } = t;
    const b = boundaryByIdx.get(t.idx);
    const win = windowByIdx.get(t.idx) || [];

    if (!b?.ts_prev || !b?.ts_next) {
      results.push({
        dispositivo: deviceName, prev_codigo: prev.codigo_lote, next_codigo: next.codigo_lote,
        gap_conteo_s: null, flujo_prev_cpm: null, flujo_next_cpm: null, interleave_alternancias: null,
        tvd_early_vs_prev: null, tvd_early_vs_stable: null, tvd_prev_vs_stable: null,
        calibre_discriminante: false, muestras_early: 0, muestras_stable: 0, muestras_prev: 0,
        score: null, clasificacion: "no_evaluable", nota: "sin conteos en la vecindad (margen 2 dias)",
      });
      continue;
    }

    const tsPrev = b.ts_prev, tsNext = b.ts_next;
    const gapConteo = (new Date(tsNext) - new Date(tsPrev)) / 1000;
    const changeTs = new Date(tsNext).getTime();
    const solapado = gapConteo < 0; // ts_next < ts_prev: solape real detectado en los bordes

    // el fetch de la ventana esta acotado por CANTIDAD (LIMIT), no por tiempo (los lotes
    // son muy densos y un rango de tiempo ancho hacia timeouts). Por eso el orden dentro
    // de win es: todo el bloque prev (ts<changeTs) seguido del bloque next (ts>=changeTs);
    // no sirve para detectar alternancias reales, solo para muestrear calibre/flujo.
    const nextRowsAsc = win.filter(r => r.lote_id === next.lote_id);
    const prevRowsDesc = win.filter(r => r.lote_id === prev.lote_id).slice().reverse();

    // flujo antes/despues del cambio real. Si el fetch (acotado a SAMPLE_CAP/NEXT_LIMIT
    // filas) se agoto ANTES de cubrir la ventana de FLOW_MIN minutos, el conteo esta
    // truncado (lote muy denso) y no es comparable -> se descarta esa senal.
    const antesLo = changeTs - FLOW_MIN * 60000, despuesHi = changeTs + FLOW_MIN * 60000;
    const cAntes = prevRowsDesc.filter(r => new Date(r.ts).getTime() >= antesLo).length;
    const cDespues = nextRowsAsc.filter(r => new Date(r.ts).getTime() < despuesHi).length;
    const prevOldestTs = prevRowsDesc.length ? new Date(prevRowsDesc[prevRowsDesc.length - 1].ts).getTime() : null;
    const nextNewestTs = nextRowsAsc.length ? new Date(nextRowsAsc[nextRowsAsc.length - 1].ts).getTime() : null;
    const antesCoverageOk = prevRowsDesc.length < PREV_LIMIT || (prevOldestTs !== null && prevOldestTs <= antesLo);
    const despuesCoverageOk = nextRowsAsc.length < NEXT_LIMIT || (nextNewestTs !== null && nextNewestTs >= despuesHi);
    const flujoAntes = cAntes / FLOW_MIN, flujoDespues = cDespues / FLOW_MIN;
    const flujoVerificable = antesCoverageOk && despuesCoverageOk;

    // calibre: early (primeros EARLY_N del lote nuevo desde el cambio), stable (siguientes),
    // prev (ultimos SAMPLE_CAP del lote anterior antes del cambio)
    const earlyRows = nextRowsAsc.slice(0, EARLY_N);
    const stableRows = nextRowsAsc.slice(EARLY_N, EARLY_N + SAMPLE_CAP);
    const prevRows = prevRowsDesc.slice(0, SAMPLE_CAP);

    const hEarly = histOf(earlyRows), hStable = histOf(stableRows), hPrev = histOf(prevRows);
    const bins = allBins(hEarly, hStable, hPrev);
    const tvdEarlyPrev = earlyRows.length && prevRows.length ? tvd(hEarly, hPrev, bins) : null;
    const tvdEarlyStable = earlyRows.length && stableRows.length ? tvd(hEarly, hStable, bins) : null;
    const tvdPrevStable = prevRows.length && stableRows.length ? tvd(hPrev, hStable, bins) : null;

    const calibreDiscriminante = tvdPrevStable !== null && tvdPrevStable >= 0.25;

    // ── scoring ──
    let score = 0;
    if (solapado) score += 40;
    else score += Math.max(0, 40 * (1 - Math.min(gapConteo, GAP_S) / GAP_S));

    if (flujoVerificable && flujoAntes > 0) {
      const ratio = flujoDespues / flujoAntes;
      score += Math.max(0, Math.min(25, 25 * Math.min(ratio, 1)));
    } else if (flujoVerificable && flujoDespues > 0) {
      score += 12;
    }

    if (calibreDiscriminante && tvdEarlyPrev !== null && tvdEarlyStable !== null) {
      const señal = tvdEarlyStable - tvdEarlyPrev; // >0: early mas cerca de prev que de stable
      score += Math.max(-35, Math.min(35, señal * 35 / Math.max(tvdPrevStable, 0.01)));
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const clasificacion = score >= 70 ? "muy_probable_mal_hecho" : score >= 40 ? "dudoso" : "probablemente_ok";

    results.push({
      dispositivo: deviceName, prev_codigo: prev.codigo_lote, next_codigo: next.codigo_lote,
      ultimo_conteo_prev: tsPrev, primer_conteo_next: tsNext,
      gap_conteo_s: Math.round(gapConteo), solapado,
      flujo_verificable: flujoVerificable,
      flujo_prev_cpm: flujoVerificable ? Number(flujoAntes.toFixed(1)) : null,
      flujo_next_cpm: flujoVerificable ? Number(flujoDespues.toFixed(1)) : null,
      tvd_early_vs_prev: tvdEarlyPrev, tvd_early_vs_stable: tvdEarlyStable, tvd_prev_vs_stable: tvdPrevStable,
      calibre_discriminante: calibreDiscriminante,
      muestras_early: earlyRows.length, muestras_stable: stableRows.length, muestras_prev: prevRows.length,
      score, clasificacion,
      nota: !calibreDiscriminante ? "calibre_no_discriminante" : "",
    });
  }

  // ── 5. Salidas ────────────────────────────────────────────────────────────
  console.log("\n[5] Escribiendo salidas");
  const sorted = [...results].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  writeFileSync(path.join(OUT, "transiciones.json"), JSON.stringify(sorted, null, 2));
  const cols = Object.keys(sorted[0] || {});
  let csv = cols.join(",") + "\n";
  for (const r of sorted) csv += cols.map(c => JSON.stringify(r[c] ?? "")).join(",") + "\n";
  writeFileSync(path.join(OUT, "transiciones.csv"), csv);
  console.log(`  wrote transiciones.json / transiciones.csv (${sorted.length} filas)`);

  const byClass = {};
  for (const r of results) byClass[r.clasificacion] = (byClass[r.clasificacion] || 0) + 1;
  console.log("\n=== Resumen por clasificacion ===");
  console.table(byClass);

  console.log("\n=== Top 20 por score ===");
  console.table(sorted.slice(0, 20).map(r => ({
    prev: r.prev_codigo, next: r.next_codigo, gap_conteo_s: r.gap_conteo_s, solapado: r.solapado,
    flujo_prev: r.flujo_prev_cpm, flujo_next: r.flujo_next_cpm,
    tvd_early_prev: r.tvd_early_vs_prev, tvd_early_stable: r.tvd_early_vs_stable,
    score: r.score, clasificacion: r.clasificacion,
  })));

  await sql.end();
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
