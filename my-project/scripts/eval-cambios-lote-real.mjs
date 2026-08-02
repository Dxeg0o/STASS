// Fase 2: propone el cambio de lote REAL (no el que registro el sistema) para
// las transiciones de ORIN-AGX-2 (Pelchuquin), usando pausas fisicas (>=3 min
// sin conteos) como unicos puntos candidatos validos + el calibre (perimeter)
// como evidencia independiente de cual lado del candidato es cada lote.
//
// READ-ONLY. Toma como insumo outputs/eval_cambios_lote/transiciones.json
// (fase 1, eval-cambios-lote.mjs) para la lista de transiciones evaluables.
//
// Por transicion: 1 query trae el stream crudo (ts, lote_id, perimeter) del
// dispositivo, RADIO conteos antes + RADIO despues del flip registrado por el
// sistema (index-seek ORDER BY ts LIMIT N sobre idx_conteo_dispositivo -- NUNCA
// rangos de tiempo anchos ni MAX/MIN con predicado de rango, ver notas de
// rendimiento en eval-cambios-lote.mjs). Todo el analisis de pausas,
// referencias de calibre y busqueda del change-point se hace en JS.
//
//   node scripts/eval-cambios-lote-real.mjs
//   node scripts/eval-cambios-lote-real.mjs --gap=180 --radio=25000
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import postgres from "postgres";

config({ path: ".env.local" });

const OUT = path.resolve("../outputs/eval_cambios_lote");
const DEVICE = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2

const argNum = (name, def) => {
  const a = (process.argv.find(a => a.startsWith(`--${name}=`)) || "").split("=")[1];
  return a ? Number(a) : def;
};
const GAP_S = argNum("gap", 180);
const RADIO = argNum("radio", 25000);
const SKIP_N = 200;   // filas mas cercanas al flip que se excluyen de las referencias (posible contaminacion)
const REF_CAP = 1500; // tamano de cada referencia de calibre
const BIN = 0.5;

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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const fase1 = JSON.parse(readFileSync(path.join(OUT, "transiciones.json"), "utf8"));
  const limit = argNum("limit", 0);
  let candidatosBase = fase1.filter(r => r.clasificacion !== "no_evaluable" && r.ultimo_conteo_prev && r.primer_conteo_next);
  if (limit) candidatosBase = candidatosBase.slice(0, limit);
  console.log(`eval-cambios-lote-real | ${candidatosBase.length} transiciones evaluables de fase 1 | gap=${GAP_S}s radio=${RADIO}`);
  await sql`set statement_timeout = '60s'`;

  const propuestas = [];
  let done = 0;
  const t0 = Date.now();

  for (const t of candidatosBase) {
    done++;
    if (done % 10 === 0 || done === 1) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  progreso ${done}/${candidatosBase.length} (${el.toFixed(0)}s, ${(el / done).toFixed(1)}s/transicion)`);
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
        clasificacion_v2: "error_query", nota: e.message });
      continue;
    }

    const n = rows.length;
    const flipTime = new Date(flip).getTime();
    const flipIdx = rows.findIndex(r => new Date(r.ts).getTime() >= flipTime); // primer indice >= flip

    // ── pausas: deltas >= GAP_S dentro del radio traido ──
    const pausas = [];
    for (let i = 1; i < n; i++) {
      const delta = (new Date(rows[i].ts) - new Date(rows[i - 1].ts)) / 1000;
      if (delta >= GAP_S) pausas.push({ idx: i, ini: rows[i - 1].ts, fin: rows[i].ts, dur_s: Math.round(delta) });
    }

    // ── referencias de calibre: prevLote lejos del flip (hacia atras) / nextLote lejos del flip (hacia adelante) ──
    // se usa el lote_id real de las filas adyacentes al flip (verdad de terreno), no el nominal
    // de la transicion, por si ya hay mezcla justo en el borde.
    const beforeFlip = rows.slice(0, flipIdx);
    const afterFlip = rows.slice(flipIdx);
    const prevLoteId = beforeFlip.length ? beforeFlip[beforeFlip.length - 1].lote_id : null; // lote_id justo antes del flip
    const nextLoteId = afterFlip.length ? afterFlip[0].lote_id : null; // deberia ser el nuevo lote

    const refARows = beforeFlip.filter(r => r.lote_id === prevLoteId).slice().reverse() // mas cercano al flip primero
      .slice(SKIP_N, SKIP_N + REF_CAP);
    const refBRows = afterFlip.filter(r => r.lote_id === nextLoteId)
      .slice(SKIP_N, SKIP_N + REF_CAP);

    const refA = histFrom(refARows), refB = histFrom(refBRows);
    const bins = [...new Set([...refA.keys(), ...refB.keys()])];
    const tvdRefs = refARows.length && refBRows.length ? tvd(refA, refB, bins) : null;
    const calibreDiscriminante = tvdRefs !== null && tvdRefs >= 0.25;

    // ── Ruta 1: el flip del sistema coincide con una pausa real (estructuralmente, sin
    // necesitar calibre) -- la evidencia mas fuerte posible: hubo un corte de linea justo
    // ahi, es un cambio bien hecho.
    const flipEsPausa = pausas.some(p => p.idx === flipIdx);
    if (flipEsPausa) {
      const durFlip = pausas.find(p => p.idx === flipIdx).dur_s;
      propuestas.push({
        prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
        cambio_real_ts: flip, delta_s: 0, conteos_mal_estampados: 0,
        n_pausas_en_radio: pausas.length, tvd_refs: tvdRefs, calibre_discriminante: calibreDiscriminante,
        pausa_dur_s: durFlip, confianza: Math.min(100, 80 + Math.min(20, durFlip / 30)),
        clasificacion_v2: "cambio_ok", nota: "",
      });
      continue;
    }

    // ── candidatos: SOLO pausas reales (>=GAP_S) + el flip mismo. No se escanea una
    // grilla de puntos arbitrarios: sin una pausa o un cambio de lote_id real, no hay
    // evidencia objetiva de que ahi haya ocurrido un cambio fisico -- escanear puntos
    // sin esa evidencia cae en comparaciones multiples sobre el ruido natural de calibre
    // dentro del mismo lote (se probo empiricamente: producia falsos "cambio_en_caliente"
    // en medio de tramos homogeneos sin pausa ni cambio de lote_id).
    const candIdxSet = new Set([flipIdx]);
    for (const p of pausas) candIdxSet.add(p.idx);
    const candIdx = [...candIdxSet].filter(i => i > 0 && i < n).sort((a, b) => a - b);
    const pausaMasCercana = pausas.length
      ? pausas.reduce((a, b) => (Math.abs(a.idx - flipIdx) <= Math.abs(b.idx - flipIdx) ? a : b))
      : null;

    // ── Ruta 2: calibre no discriminante -- no se puede confirmar CUAL pausa es la
    // correcta con evidencia de producto. Si hay al menos una pausa cerca, se sugiere
    // la mas proxima al flip como candidato de baja confianza (mejor que nada, pero sin
    // confirmar); si no hay ninguna pausa en el radio, no hay evidencia de ningun tipo.
    if (!calibreDiscriminante) {
      if (pausaMasCercana) {
        propuestas.push({
          prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
          cambio_real_ts: pausaMasCercana.fin,
          delta_s: Math.round((new Date(pausaMasCercana.fin) - flipTime) / 1000),
          conteos_mal_estampados: Math.abs(pausaMasCercana.idx - flipIdx),
          n_pausas_en_radio: pausas.length, tvd_refs: tvdRefs, calibre_discriminante: false,
          pausa_dur_s: pausaMasCercana.dur_s, confianza: 25,
          clasificacion_v2: "cambio_desplazado_sugerido",
          nota: "calibre_no_discriminante: pausa mas cercana propuesta sin confirmar por producto",
        });
      } else {
        propuestas.push({
          prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
          cambio_real_ts: null, delta_s: null, conteos_mal_estampados: null,
          n_pausas_en_radio: 0, tvd_refs: tvdRefs, calibre_discriminante: false,
          pausa_dur_s: null, confianza: 5,
          clasificacion_v2: "sin_evidencia", nota: "sin pausas en el radio y calibre no discriminante",
        });
      }
      continue;
    }

    // ── Ruta 3: calibre discriminante -- comparar el flip contra cada pausa candidata
    // por que tan bien separa refA (antes) de refB (despues); el que mejor separa gana.
    // prefijo acumulado de histograma SOLO en los indices candidatos (evita O(n*bins))
    const totalHist = histFrom(rows);
    const prefixAt = new Map();
    let running = new Map();
    let ci = 0;
    for (let i = 0; i < n; i++) {
      if (ci < candIdx.length && candIdx[ci] === i) { prefixAt.set(i, new Map(running)); ci++; }
      const r = rows[i];
      if (r.perimeter > 0) { const b = binOf(r.perimeter); running.set(b, (running.get(b) || 0) + 1); }
    }
    if (ci < candIdx.length && candIdx[ci] === n) prefixAt.set(n, new Map(running));

    const scored = candIdx.map(i => {
      const before = prefixAt.get(i);
      const after = subtractHist(totalHist, before);
      const bins2 = [...new Set([...before.keys(), ...after.keys(), ...bins])];
      const tvdBeforeA = tvd(before, refA, bins2), tvdBeforeB = tvd(before, refB, bins2);
      const tvdAfterA = tvd(after, refA, bins2), tvdAfterB = tvd(after, refB, bins2);
      const correctness = (tvdBeforeB - tvdBeforeA) + (tvdAfterA - tvdAfterB);
      const esPausa = pausas.some(p => p.idx === i);
      return { idx: i, correctness, esPausa, ts: rows[i].ts };
    }).sort((a, b) => b.correctness - a.correctness);

    const best = scored[0];
    const second = scored[1];
    // sin un segundo candidato (solo el flip, cero pausas en el radio) no hay margen
    // comparativo real -- no se le da credito de "margen" a un candidato unico.
    const margen = second ? best.correctness - second.correctness : 0;
    const bestTime = new Date(best.ts).getTime();
    const deltaS = Math.round((bestTime - flipTime) / 1000);

    // best.idx === flipIdx (unico caso posible ya que flipEsPausa se descarto arriba)
    // => ninguna pausa separa mejor que el flip mismo => mezcla fisica confirmada ahi.
    const clasificacion_v2 = best.idx === flipIdx ? "cambio_en_caliente_confirmado" : "cambio_desplazado_confirmado";

    const idxMin = Math.min(flipIdx, best.idx), idxMax = Math.max(flipIdx, best.idx);
    const malEstampados = idxMax - idxMin;
    const truncado = (idxMin === 0 || idxMax === n); // el radio no alcanzo a cubrir el intervalo completo

    const confianza = Math.max(0, Math.min(100, Math.round(
      Math.min(35, tvdRefs * 35 / 0.5) +
      Math.min(30, margen * 60) +
      (best.esPausa ? 20 : 10) +
      Math.min(15, 15 * Math.min(refARows.length, refBRows.length) / REF_CAP)
    )));

    propuestas.push({
      prev_codigo: t.prev_codigo, next_codigo: t.next_codigo, flip_ts: flip,
      cambio_real_ts: best.ts, delta_s: deltaS, es_pausa: best.esPausa,
      pausa_dur_s: best.esPausa ? pausas.find(p => p.idx === best.idx)?.dur_s : null,
      n_pausas_en_radio: pausas.length, tvd_refs: Number(tvdRefs.toFixed(3)), calibre_discriminante: true,
      margen: Number(margen.toFixed(3)), conteos_mal_estampados: malEstampados, truncado_por_radio: truncado,
      muestras_refA: refARows.length, muestras_refB: refBRows.length,
      confianza, clasificacion_v2, nota: truncado ? "cambio_real_fuera_del_radio_traido" : "",
    });
  }

  console.log("\nEscribiendo salidas");
  const sorted = [...propuestas].sort((a, b) => (b.confianza ?? -1) - (a.confianza ?? -1));
  writeFileSync(path.join(OUT, "propuestas_cambio_real.json"), JSON.stringify(sorted, null, 2));
  const cols = [...new Set(sorted.flatMap(r => Object.keys(r)))];
  let csv = cols.join(",") + "\n";
  for (const r of sorted) csv += cols.map(c => JSON.stringify(r[c] ?? "")).join(",") + "\n";
  writeFileSync(path.join(OUT, "propuestas_cambio_real.csv"), csv);
  console.log(`  wrote propuestas_cambio_real.json/csv (${sorted.length} filas)`);

  const byClass = {};
  for (const r of propuestas) byClass[r.clasificacion_v2] = (byClass[r.clasificacion_v2] || 0) + 1;
  console.log("\n=== Resumen clasificacion v2 ===");
  console.table(byClass);

  const totalMal = propuestas.reduce((s, r) => s + (r.conteos_mal_estampados || 0), 0);
  console.log(`\nTotal conteos potencialmente mal estampados (suma, con solape entre transiciones vecinas): ${totalMal}`);

  console.log("\n=== Top 20 por conteos mal estampados ===");
  console.table(sorted.filter(r => r.conteos_mal_estampados != null)
    .sort((a, b) => b.conteos_mal_estampados - a.conteos_mal_estampados).slice(0, 20)
    .map(r => ({
      prev: r.prev_codigo, next: r.next_codigo, flip: r.flip_ts, cambio_real: r.cambio_real_ts,
      delta_s: r.delta_s, mal_estampados: r.conteos_mal_estampados, clasificacion: r.clasificacion_v2, confianza: r.confianza,
    })));

  await sql.end();
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
