// Fase 3: propuesta de cambio de lote real con evidencia reforzada. READ-ONLY.
//
// Mejoras sobre eval-cambios-lote-real.mjs (fase 2):
//  1. MICRO-PAUSAS (30-180s) como candidatos debiles: un cambio hecho en un corte
//     corto (limpieza insuficiente) hoy caia en "sin_evidencia".
//  2. PRIOR OPERACIONAL: el flip del sistema llega TARDE en ~2/3 de los casos
//     (la cuadrilla cambia la linea, arranca, y despues alguien actualiza el
//     sistema). Se usa solo como desempate entre candidatos parejos.
//  3. VALIDACION SAP: residual QB-SAP por lote (lote_stats vs Detalle_lote_calibre
//     del archivo REAL_conteos_sap_desde_04_06_2026.xlsx). Una propuesta que mueve
//     N conteos del lote X al Y esta soportada si reduce |residual X| + |residual Y|.
//  4. DEDUP GLOBAL: transiciones vecinas que reclaman la MISMA pausa se marcan
//     (antes se contaban doble los conteos mal estampados).
//
//   node scripts/eval-cambios-lote-v3.mjs
//   node scripts/eval-cambios-lote-v3.mjs --gap=180 --micro=30 --radio=25000 --limit=8
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import postgres from "postgres";
import XLSX from "xlsx";

config({ path: ".env.local" });

const OUT = path.resolve("../outputs/eval_cambios_lote");
const DEVICE = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2
const SAP_XLSX = path.join(process.env.HOME, "Downloads/REAL_conteos_sap_desde_04_06_2026.xlsx");

const argNum = (name, def) => {
  const a = (process.argv.find(x => x.startsWith(`--${name}=`)) || "").split("=")[1];
  return a ? Number(a) : def;
};
const GAP_S = argNum("gap", 180);     // pausa completa (regla de limpieza)
const MICRO_S = argNum("micro", 30);  // umbral inferior de micro-pausa
const RADIO = argNum("radio", 25000);
const LIMIT = argNum("limit", 0);
const SKIP_N = 200;
const REF_CAP = 1500;
const BIN = 0.5;
const TIE_MARGIN = 0.02; // candidatos con correctness a menos de esto se consideran empate

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
const sql = postgres(cs, { max: 1, idle_timeout: 20, connect_timeout: 15 });

// ── utilidades ──────────────────────────────────────────────────────────────
const iso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
const binOf = (p) => Math.round(p / BIN) * BIN;
function histFrom(rows) {
  const h = new Map();
  for (const r of rows) if (r.perimeter > 0) h.set(binOf(r.perimeter), (h.get(binOf(r.perimeter)) || 0) + 1);
  return h;
}
function tvd(a, b, bins) {
  const totA = bins.reduce((s, k) => s + (a.get(k) || 0), 0) || 1;
  const totB = bins.reduce((s, k) => s + (b.get(k) || 0), 0) || 1;
  let d = 0;
  for (const k of bins) d += Math.abs((a.get(k) || 0) / totA - (b.get(k) || 0) / totB);
  return d / 2;
}
function subtractHist(total, partial) {
  const out = new Map(total);
  for (const [k, v] of partial) out.set(k, (out.get(k) || 0) - v);
  return out;
}

// bandas SAP: "12/14" -> [12,14). Se usan las bandas activas de cada lote.
function parseBanda(s) {
  const [lo, hi] = String(s).split("/").map(Number);
  return Number.isFinite(lo) && Number.isFinite(hi) ? { banda: s, lo, hi } : null;
}

// ── carga SAP ────────────────────────────────────────────────────────────────
function cargarSap() {
  const wb = XLSX.readFile(SAP_XLSX);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Detalle_lote_calibre"]);
  // filas: { Lote, Variedad, Calibre, "Base pre-04 eliminada", "Final acumulado 30.06", "Neto desde 04.06" }
  const porLote = new Map(); // codigo -> { bandas: [{banda,lo,hi,final}], total }
  for (const r of rows) {
    const banda = parseBanda(r["Calibre"]);
    if (!banda) continue;
    const final = Number(r["Final acumulado 30.06"]) || 0;
    if (!porLote.has(r["Lote"])) porLote.set(r["Lote"], { bandas: [], total: 0 });
    const e = porLote.get(r["Lote"]);
    e.bandas.push({ ...banda, final });
    e.total += final;
  }
  return porLote;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const fase1 = JSON.parse(readFileSync(path.join(OUT, "transiciones.json"), "utf8"));
  let base = fase1.filter(r => r.clasificacion !== "no_evaluable" && r.ultimo_conteo_prev && r.primer_conteo_next);
  if (LIMIT) base = base.slice(0, LIMIT);

  const sap = cargarSap();
  console.log(`eval-cambios-lote-v3 | ${base.length} transiciones | gap=${GAP_S}s micro=${MICRO_S}s radio=${RADIO} | SAP: ${sap.size} lotes`);
  await sql`set statement_timeout = '60s'`;

  // ── QB por lote: histograma calibre precalculado (lote_stats), restringido a bandas
  // SAP +-1cm del propio lote (los calibres fuera de banda son merma/descartes que SAP
  // no registra -- metodo ya validado en la conciliacion previa).
  console.log("\n[1] Cargando lote_stats (QB por lote x calibre) y calculando residuales QB-SAP");
  const qbStats = await sql.unsafe(`
    select lo.codigo_lote, ls.calibre, ls.count_in
    from lote_stats ls join lote lo on lo.id = ls.lote_id
    where ls.dispositivo_id = '${DEVICE}'`);
  const qbPorLote = new Map();
  for (const r of qbStats) {
    if (!qbPorLote.has(r.codigo_lote)) qbPorLote.set(r.codigo_lote, []);
    qbPorLote.get(r.codigo_lote).push({ calibre: r.calibre, n: r.count_in });
  }

  // residual por lote = QB(restringido a bandas SAP +-1) - SAP(final 30.06)
  const residual = new Map();
  for (const [codigo, s] of sap) {
    const qb = qbPorLote.get(codigo);
    if (!qb || !s.bandas.length) continue;
    const lo = Math.min(...s.bandas.map(b => b.lo)) - 1, hi = Math.max(...s.bandas.map(b => b.hi)) + 1;
    const qbTotal = qb.filter(x => x.calibre >= lo && x.calibre < hi).reduce((a, x) => a + x.n, 0);
    residual.set(codigo, { qb: qbTotal, sap: s.total, res: qbTotal - s.total });
  }
  console.log(`  residuales calculados para ${residual.size} lotes (interseccion QB/SAP)`);

  // salida propia: la tabla de residuales es diagnostico valioso por si sola --
  // residuales grandes (cientos de miles) apuntan a errores mas alla de pausas
  // desplazadas (p.ej. sesiones enteras con el lote equivocado).
  {
    let csv = "lote,qb_en_bandas_sap,sap_final_3006,residual,residual_pct\n";
    const resRows = [...residual.entries()].sort((a, b) => a[1].res - b[1].res);
    for (const [cod, r] of resRows)
      csv += `${cod},${r.qb},${r.sap},${r.res},${r.sap ? (100 * r.res / r.sap).toFixed(1) : ""}\n`;
    writeFileSync(path.join(OUT, "residuales_qb_sap.csv"), csv);
    console.log(`  wrote residuales_qb_sap.csv (${resRows.length} lotes)`);
  }

  // ── loop por transicion ─────────────────────────────────────────────────────
  console.log("\n[2] Analisis por transicion (stream +-radio, pausas, calibre, prior, SAP)");
  const propuestas = [];
  let done = 0;
  const t0 = Date.now();

  for (const t of base) {
    done++;
    if (done % 10 === 0 || done === 1) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  progreso ${done}/${base.length} (${el.toFixed(0)}s, ${(el / done).toFixed(1)}s/transicion)`);
    }

    const flip = t.primer_conteo_next;
    let rows;
    try {
      rows = await sql.unsafe(`
        with stream as (
          (select ts, lote_id, perimeter from conteo
           where dispositivo_id='${DEVICE}' and ts < '${flip}'::timestamptz
           order by ts desc limit ${RADIO})
          union all
          (select ts, lote_id, perimeter from conteo
           where dispositivo_id='${DEVICE}' and ts >= '${flip}'::timestamptz
           order by ts asc limit ${RADIO})
        )
        select ts, lote_id, perimeter from stream order by ts`);
    } catch (e) {
      propuestas.push({ prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
        clasificacion_v3: "error_query", nota: e.message });
      continue;
    }

    const n = rows.length;
    const flipTime = new Date(flip).getTime();
    const flipIdx = rows.findIndex(r => new Date(r.ts).getTime() >= flipTime);

    // pausas completas y micro-pausas
    const pausas = [];
    for (let i = 1; i < n; i++) {
      const delta = (new Date(rows[i].ts) - new Date(rows[i - 1].ts)) / 1000;
      if (delta >= MICRO_S) pausas.push({ idx: i, fin: rows[i].ts, dur_s: Math.round(delta), micro: delta < GAP_S });
    }
    const pausasLlenas = pausas.filter(p => !p.micro);

    // referencias de calibre
    const beforeFlip = rows.slice(0, flipIdx), afterFlip = rows.slice(flipIdx);
    const prevLoteId = beforeFlip.length ? beforeFlip[beforeFlip.length - 1].lote_id : null;
    const nextLoteId = afterFlip.length ? afterFlip[0].lote_id : null;
    const refARows = beforeFlip.filter(r => r.lote_id === prevLoteId).slice().reverse().slice(SKIP_N, SKIP_N + REF_CAP);
    const refBRows = afterFlip.filter(r => r.lote_id === nextLoteId).slice(SKIP_N, SKIP_N + REF_CAP);
    const refA = histFrom(refARows), refB = histFrom(refBRows);
    const binsRef = [...new Set([...refA.keys(), ...refB.keys()])];
    const tvdRefs = refARows.length && refBRows.length ? tvd(refA, refB, binsRef) : null;
    const calibreDiscriminante = tvdRefs !== null && tvdRefs >= 0.25;

    // Ruta 1: flip coincide con pausa COMPLETA -> cambio bien hecho
    const pausaEnFlip = pausasLlenas.find(p => p.idx === flipIdx);
    const microEnFlip = pausas.find(p => p.idx === flipIdx && p.micro);
    if (pausaEnFlip) {
      propuestas.push({
        prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
        cambio_real_ts: flip, delta_s: 0, conteos_mal_estampados: 0, pausa_dur_s: pausaEnFlip.dur_s,
        tipo_pausa: "completa", n_pausas_radio: pausasLlenas.length, n_micro_radio: pausas.length - pausasLlenas.length,
        tvd_refs: tvdRefs, calibre_discriminante: calibreDiscriminante, sap_soporte: null,
        confianza: Math.min(100, Math.round(80 + Math.min(20, pausaEnFlip.dur_s / 30))),
        clasificacion_v3: "cambio_ok", nota: "",
      });
      continue;
    }

    // candidatos: flip + todas las pausas (completas y micro)
    const candIdxSet = new Set([flipIdx]);
    for (const p of pausas) candIdxSet.add(p.idx);
    const candIdx = [...candIdxSet].filter(i => i > 0 && i < n).sort((a, b) => a - b);
    const pausaByIdx = new Map(pausas.map(p => [p.idx, p]));

    let best = null, margen = 0, correctnessFlip = null;
    if (calibreDiscriminante) {
      // prefijos de histograma solo en candidatos
      const totalHist = histFrom(rows);
      const prefixAt = new Map();
      let running = new Map(), ci = 0;
      for (let i = 0; i < n; i++) {
        if (ci < candIdx.length && candIdx[ci] === i) { prefixAt.set(i, new Map(running)); ci++; }
        const r = rows[i];
        if (r.perimeter > 0) { const b = binOf(r.perimeter); running.set(b, (running.get(b) || 0) + 1); }
      }
      const scored = candIdx.map(i => {
        const before = prefixAt.get(i);
        const after = subtractHist(totalHist, before);
        const bins2 = [...new Set([...before.keys(), ...after.keys(), ...binsRef])];
        const correctness = (tvd(before, refB, bins2) - tvd(before, refA, bins2))
                          + (tvd(after, refA, bins2) - tvd(after, refB, bins2));
        return { idx: i, correctness, ts: rows[i].ts, pausa: pausaByIdx.get(i) ?? null };
      }).sort((a, b) => b.correctness - a.correctness);

      correctnessFlip = scored.find(s => s.idx === flipIdx)?.correctness ?? null;
      // PRIOR OPERACIONAL como desempate: entre candidatos empatados (correctness a
      // menos de TIE_MARGIN del mejor), preferir pausa COMPLETA sobre micro, y
      // ANTERIOR al flip sobre posterior (el flip suele llegar tarde).
      const empatados = scored.filter(s => scored[0].correctness - s.correctness < TIE_MARGIN);
      empatados.sort((a, b) => {
        const pa = a.pausa ? (a.pausa.micro ? 1 : 2) : 0, pb = b.pausa ? (b.pausa.micro ? 1 : 2) : 0;
        if (pa !== pb) return pb - pa;                       // pausa completa > micro > sin pausa
        const anteA = a.idx < flipIdx ? 1 : 0, anteB = b.idx < flipIdx ? 1 : 0;
        if (anteA !== anteB) return anteB - anteA;           // antes del flip > despues
        return b.correctness - a.correctness;
      });
      best = empatados[0];
      margen = scored.length > 1 ? scored[0].correctness - scored[1].correctness : 0;
    } else {
      // calibre no discrimina: propuesta estructural = pausa mas cercana al flip,
      // prefiriendo completas sobre micro y (prior) anteriores sobre posteriores.
      const orden = [...pausas].sort((a, b) => {
        if (a.micro !== b.micro) return a.micro ? 1 : -1;
        const da = Math.abs(a.idx - flipIdx), db = Math.abs(b.idx - flipIdx);
        if (Math.min(da, db) > 0 && Math.abs(da - db) > RADIO * 0.02) return da - db;
        const anteA = a.idx < flipIdx ? 0 : 1, anteB = b.idx < flipIdx ? 0 : 1;
        if (anteA !== anteB) return anteA - anteB;
        return da - db;
      });
      const p = orden[0];
      best = p ? { idx: p.idx, ts: p.fin, correctness: null, pausa: p } : null;
    }

    if (!best) {
      propuestas.push({
        prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
        cambio_real_ts: null, delta_s: null, conteos_mal_estampados: null,
        tipo_pausa: microEnFlip ? "micro_en_flip" : "ninguna",
        n_pausas_radio: 0, n_micro_radio: 0, tvd_refs: tvdRefs, calibre_discriminante: calibreDiscriminante,
        sap_soporte: null, confianza: 5, clasificacion_v3: "sin_evidencia",
        nota: "sin pausas (ni micro) en el radio y calibre " + (calibreDiscriminante ? "discriminante pero sin candidatos" : "no discriminante"),
      });
      continue;
    }

    const deltaS = Math.round((new Date(best.ts).getTime() - flipTime) / 1000);
    const idxMin = Math.min(flipIdx, best.idx), idxMax = Math.max(flipIdx, best.idx);
    const malEstampados = idxMax - idxMin;
    const truncado = idxMin === 0 || idxMax === n;

    // ── soporte SAP: mover el intervalo [idxMin,idxMax) del lote sobrante al faltante
    // deberia reducir |residual| de ambos. dir: delta<0 => conteos estampados como PREV
    // pertenecen a NEXT (flip tarde); delta>0 => estampados como NEXT pertenecen a PREV.
    let sapSoporte = null, sapMejora = null;
    const desde = deltaS < 0 ? t.prev_codigo : t.next_codigo; // lote que HOY tiene esos conteos
    const hacia = deltaS < 0 ? t.next_codigo : t.prev_codigo; // lote al que pertenecen realmente
    const rDesde = residual.get(desde), rHacia = residual.get(hacia);
    if (malEstampados > 0 && rDesde && rHacia) {
      const N = malEstampados;
      const antes = Math.abs(rDesde.res) + Math.abs(rHacia.res);
      const despues = Math.abs(rDesde.res - N) + Math.abs(rHacia.res + N);
      sapMejora = antes - despues; // >0: la propuesta acerca ambos lotes a SAP
      sapSoporte = sapMejora > 0.5 * N ? "apoya" : sapMejora < -0.5 * N ? "contradice" : "neutro";
    }

    // ── confianza ──
    let conf = 0;
    if (calibreDiscriminante) {
      conf += Math.min(30, tvdRefs * 30 / 0.5);
      conf += Math.min(25, margen * 50);
    } else {
      conf += 8; // solo evidencia estructural
    }
    conf += best.pausa ? (best.pausa.micro ? 10 : 18) : 5;
    conf += deltaS < 0 ? 4 : 0; // consistente con el prior flip-tarde
    // SAP como senal DEBIL: el residual de un lote acumula los errores de TODAS sus
    // transiciones (y posibles sesiones enteras mal estampadas), asi que no puede
    // juzgar con fuerza una transicion individual -- solo inclina.
    if (sapSoporte === "apoya") conf += 8;
    else if (sapSoporte === "contradice") conf -= 6;
    else if (sapSoporte === "neutro") conf += 2;
    conf = Math.max(0, Math.min(100, Math.round(conf)));

    // ── clasificacion v3 ──
    let clas;
    if (best.idx === flipIdx) clas = "cambio_en_caliente_confirmado";
    else if (calibreDiscriminante && best.pausa && !best.pausa.micro) clas = "cambio_desplazado_confirmado";
    else if (calibreDiscriminante && best.pausa?.micro) clas = "cambio_desplazado_micro_confirmado";
    else if (best.pausa && sapSoporte === "apoya") clas = "cambio_desplazado_probable_sap";
    else if (best.pausa && !best.pausa.micro) clas = "cambio_desplazado_sugerido";
    else clas = "cambio_desplazado_micro_sugerido";

    propuestas.push({
      prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
      cambio_real_ts: best.ts, delta_s: deltaS, conteos_mal_estampados: malEstampados,
      lote_sobrante: malEstampados ? desde : null, lote_faltante: malEstampados ? hacia : null,
      pausa_dur_s: best.pausa?.dur_s ?? null, tipo_pausa: best.pausa ? (best.pausa.micro ? "micro" : "completa") : "ninguna",
      n_pausas_radio: pausasLlenas.length, n_micro_radio: pausas.length - pausasLlenas.length,
      tvd_refs: tvdRefs != null ? Number(tvdRefs.toFixed(3)) : null, calibre_discriminante: calibreDiscriminante,
      margen: Number(margen.toFixed(3)), truncado_por_radio: truncado,
      sap_soporte: sapSoporte, sap_mejora: sapMejora != null ? Math.round(sapMejora) : null,
      confianza: conf, clasificacion_v3: clas, nota: truncado ? "cambio_real_fuera_del_radio_traido" : "",
    });
  }

  // ── dedup global: propuestas que reclaman la misma pausa (mismo cambio_real_ts) ──
  console.log("\n[3] Dedup global de pausas compartidas");
  const porPausa = new Map();
  for (const p of propuestas) {
    if (!p.cambio_real_ts || !p.conteos_mal_estampados) continue;
    const k = String(p.cambio_real_ts);
    if (!porPausa.has(k)) porPausa.set(k, []);
    porPausa.get(k).push(p);
  }
  let dups = 0;
  for (const [, grupo] of porPausa) {
    if (grupo.length < 2) continue;
    grupo.sort((a, b) => b.confianza - a.confianza);
    for (const g of grupo.slice(1)) { g.duplicada_de_pausa = true; g.nota = (g.nota ? g.nota + "; " : "") + "comparte pausa con otra transicion (no sumar doble)"; dups++; }
  }
  console.log(`  ${dups} propuestas marcadas como duplicadas de pausa`);

  // ── salidas ──
  console.log("\n[4] Escribiendo salidas");
  const sorted = [...propuestas].sort((a, b) => (b.confianza ?? -1) - (a.confianza ?? -1));
  writeFileSync(path.join(OUT, "propuestas_v3.json"), JSON.stringify(sorted, null, 2));
  const cols = [...new Set(sorted.flatMap(r => Object.keys(r)))];
  let csv = cols.join(",") + "\n";
  for (const r of sorted) csv += cols.map(c => JSON.stringify(r[c] ?? "")).join(",") + "\n";
  writeFileSync(path.join(OUT, "propuestas_v3.csv"), csv);
  console.log(`  wrote propuestas_v3.json/csv (${sorted.length} filas)`);

  const byClass = {};
  for (const r of propuestas) byClass[r.clasificacion_v3] = (byClass[r.clasificacion_v3] || 0) + 1;
  console.log("\n=== Clasificacion v3 ===");
  console.table(byClass);

  const bySap = {};
  for (const r of propuestas) if (r.sap_soporte) bySap[r.sap_soporte] = (bySap[r.sap_soporte] || 0) + 1;
  console.log("=== Soporte SAP (propuestas con lotes en archivo SAP) ===");
  console.table(bySap);

  const unicos = sorted.filter(r => r.conteos_mal_estampados > 0 && !r.duplicada_de_pausa);
  console.log(`\nConteos mal estampados (sin duplicados): ${unicos.reduce((s, r) => s + r.conteos_mal_estampados, 0)}`);

  console.log("\n=== Top 20 propuestas por confianza (con desplazamiento) ===");
  console.table(unicos.slice(0, 20).map(r => ({
    prev: r.prev_codigo, next: r.next_codigo, delta_s: r.delta_s, mal_estamp: r.conteos_mal_estampados,
    pausa: r.tipo_pausa + (r.pausa_dur_s ? `(${r.pausa_dur_s}s)` : ""), sap: r.sap_soporte ?? "-",
    conf: r.confianza, clasificacion: r.clasificacion_v3,
  })));

  await sql.end();
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
