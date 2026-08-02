// Exporta un Excel con los conteos por lote_session de ORIN-AGX-2, aplicando las
// correcciones propuestas en propuestas_v3.json (fase 3, eval-cambios-lote-v3.mjs).
// READ-ONLY: no modifica la BD, solo lee conteo/lote_session y escribe un .xlsx.
//
// Hoja 1 "lote_session_corregido": una fila por lote_session (todas las de AGX-2,
//   ordenadas por fecha de inicio), con conteo original (bulbos tal como estan
//   estampados hoy), la correccion neta propuesta (entrada de la transicion anterior
//   + salida hacia la siguiente) y el conteo corregido resultante.
// Hoja 2 "total_por_lote": suma por codigo_lote, restringida a lote_session con
//   start_time entre --desde y --hasta (por defecto 2026-05-28 .. 2026-07-02).
// Hoja 3 "comparacion_sap": total LIFETIME por codigo_lote (todas las sesiones)
//   contra el archivo SAP, residual antes y despues de aplicar las correcciones.
//
//   node scripts/export-lote-session-excel.mjs
//   node scripts/export-lote-session-excel.mjs --desde=2026-05-28 --hasta=2026-07-02
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import postgres from "postgres";
import XLSX from "xlsx";

config({ path: ".env.local" });

const OUT = path.resolve("../outputs/eval_cambios_lote");
const DEVICE = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2

const argStr = (name, def) => (process.argv.find(a => a.startsWith(`--${name}=`)) || `--${name}=${def}`).split("=")[1];
const DESDE = argStr("desde", "2026-05-28");
const HASTA = argStr("hasta", "2026-07-02");

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
const sql = postgres(cs, { max: 1, idle_timeout: 20, connect_timeout: 15 });
const iso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

async function main() {
  mkdirSync(OUT, { recursive: true });
  await sql`set statement_timeout = '170s'`;

  console.log("[1] Cargando lote_session de ORIN-AGX-2");
  const sessions = await sql`
    select ls.id, ls.lote_id, lo.codigo_lote, ls.start_time, ls.end_time
    from lote_session ls join lote lo on lo.id = ls.lote_id
    where ls.dispositivo_id = ${DEVICE}
    order by ls.start_time`;
  console.log(`  ${sessions.length} sesiones`);

  // ── transiciones (mismo criterio que fase 1/2/3): pares consecutivos con lote_id
  // distinto. Se recalculan los bordes reales (ultimo conteo prev / primer conteo
  // next) para poder enlazar cada propuesta de propuestas_v3.json (que solo guarda
  // codigo_lote, ambiguo si hay codigos duplicados) a un PAR DE SESSION_ID concreto,
  // usando flip_ts (= primer conteo del lote nuevo) como llave exacta de match.
  console.log("\n[2] Recalculando transiciones + bordes reales (para enlazar por sesion, no por codigo)");
  const transitions = [];
  for (let i = 0; i < sessions.length - 1; i++) {
    const prev = sessions[i], next = sessions[i + 1];
    if (prev.lote_id === next.lote_id) continue;
    transitions.push({ idx: transitions.length, prevIdx: i, nextIdx: i + 1, prev, next });
  }
  const MARGIN_SAFETY = "2 days";
  const valsA = transitions.map(t => {
    const ns = iso(t.next.start_time);
    return `(${t.idx}, '${t.prev.lote_id}'::uuid, '${t.next.lote_id}'::uuid, '${ns}'::timestamptz)`;
  }).join(",\n");
  const boundaries = transitions.length ? await sql.unsafe(`
    with t(idx, prev_lote, next_lote, ns) as (values ${valsA})
    select t.idx::int,
      (select c.ts from conteo c where c.dispositivo_id='${DEVICE}' and c.lote_id=t.prev_lote
         and c.ts < t.ns + interval '${MARGIN_SAFETY}' order by c.ts desc limit 1) as ts_prev,
      (select c.ts from conteo c where c.dispositivo_id='${DEVICE}' and c.lote_id=t.next_lote
         and c.ts >= t.ns - interval '${MARGIN_SAFETY}' order by c.ts asc limit 1) as ts_next
    from t order by t.idx`) : [];
  const boundaryByIdx = new Map(boundaries.map(b => [b.idx, b]));

  // ── enlazar con propuestas_v3.json por flip_ts exacto ──────────────────────
  const propuestas = JSON.parse(await (async () => {
    const fs = await import("fs");
    return fs.readFileSync(path.join(OUT, "propuestas_v3.json"), "utf8");
  })());
  const propByFlip = new Map(propuestas.map(p => [String(new Date(p.flip_ts).getTime()), p]));

  let enlazadas = 0;
  for (const t of transitions) {
    const b = boundaryByIdx.get(t.idx);
    if (!b?.ts_next) continue;
    const p = propByFlip.get(String(new Date(b.ts_next).getTime()));
    if (p) { t.propuesta = p; enlazadas++; }
  }
  console.log(`  ${enlazadas}/${transitions.length} transiciones enlazadas con su propuesta v3 (por flip_ts exacto)`);

  // ── correccion neta por sesion ───────────────────────────────────────────────
  // BUG corregido: la fase 3 media "conteos_mal_estampados" contando TODAS las filas
  // (de cualquier lote_id) en el intervalo [flip, cambio_real), y el export anterior
  // le restaba ese numero completo a UNA sola sesion vecina -- si esa sesion era chica
  // (o el intervalo se extendia mas alla de ella, hacia otras sesiones del mismo lote_id;
  // 75/102 lote_id de AGX-2 tienen mas de una lote_session), la resta daba negativo.
  //
  // Fix: para cada transicion con propuesta de desplazamiento, se recalculan los
  // conteos SOLO del lote_id en disputa dentro de [t0,t1), y se distribuyen (con
  // consultas puntuales, acotadas por lote_id) entre TODAS las lote_session reales
  // de ese lote_id que se solapan con esa ventana -- nunca mas de lo que cada una
  // efectivamente tiene. El lado que RECIBE los conteos es siempre la sesion que
  // define el propio flip (no tiene este problema: por definicion empieza justo ahi).
  console.log("\n[3] Recalculando correcciones por sesion real (acotadas, sin negativos)");
  const correccionPorSesion = new Map(sessions.map(s => [s.id, 0]));
  const notaPorSesion = new Map();
  const addNota = (id, txt) => notaPorSesion.set(id, [...(notaPorSesion.get(id) || []), txt]);
  const sessionsPorLote = new Map();
  for (const s of sessions) { if (!sessionsPorLote.has(s.lote_id)) sessionsPorLote.set(s.lote_id, []); sessionsPorLote.get(s.lote_id).push(s); }
  const nextStartOf = new Map(sessions.map((s, i) => [s.id, i < sessions.length - 1 ? sessions[i + 1].start_time : null]));

  let transicionesConCorreccion = 0;
  for (const t of transitions) {
    const p = t.propuesta;
    if (!p || !p.cambio_real_ts || !p.delta_s) continue; // sin propuesta o delta_s===0 -> sin correccion

    const flipTime = new Date(p.flip_ts).getTime();
    const bestTime = new Date(p.cambio_real_ts).getTime();
    const t0 = new Date(Math.min(flipTime, bestTime)), t1 = new Date(Math.max(flipTime, bestTime));
    const loteDisputaId = p.delta_s < 0 ? t.prev.lote_id : t.next.lote_id; // hoy tiene esos conteos, no deberia
    const loteDestinoId = p.delta_s < 0 ? t.next.lote_id : t.prev.lote_id;
    const codDisputa = p.delta_s < 0 ? t.prev.codigo_lote : t.next.codigo_lote;
    const codDestino = p.delta_s < 0 ? t.next.codigo_lote : t.prev.codigo_lote;
    const sesionDestino = p.delta_s < 0 ? t.next : t.prev; // define el propio flip -> sin riesgo de fragmentacion

    // sesiones reales de loteDisputaId que se solapan con [t0,t1)
    const candidatas = (sessionsPorLote.get(loteDisputaId) || []).filter(s => {
      const sStart = new Date(s.start_time).getTime();
      const sEnd = nextStartOf.get(s.id) ? new Date(nextStartOf.get(s.id)).getTime() : Infinity;
      return sStart < t1.getTime() && sEnd > t0.getTime();
    });
    if (!candidatas.length) continue;

    let totalMovido = 0;
    for (const s of candidatas) {
      const sStart = new Date(s.start_time);
      const sEndRaw = nextStartOf.get(s.id);
      const winLo = new Date(Math.max(sStart.getTime(), t0.getTime()));
      const winHi = sEndRaw ? new Date(Math.min(new Date(sEndRaw).getTime(), t1.getTime())) : t1;
      if (winLo >= winHi) continue;
      const r = await sql`select count(*)::int n from conteo where dispositivo_id=${DEVICE} and lote_id=${loteDisputaId} and ts >= ${winLo} and ts < ${winHi}`;
      const overlapN = r[0].n;
      if (!overlapN) continue;
      correccionPorSesion.set(s.id, (correccionPorSesion.get(s.id) || 0) - overlapN);
      addNota(s.id, `sale hacia ${codDestino} (transicion ${t.prev.codigo_lote}->${t.next.codigo_lote}, ${p.clasificacion_v3} conf=${p.confianza}): -${overlapN}`);
      totalMovido += overlapN;
    }
    if (!totalMovido) continue;
    correccionPorSesion.set(sesionDestino.id, (correccionPorSesion.get(sesionDestino.id) || 0) + totalMovido);
    addNota(sesionDestino.id, `entra desde ${codDisputa} (transicion ${t.prev.codigo_lote}->${t.next.codigo_lote}, ${p.clasificacion_v3} conf=${p.confianza}): +${totalMovido}`);
    transicionesConCorreccion++;
  }
  console.log(`  ${transicionesConCorreccion} transiciones con correccion aplicada`);

  // ── conteo original por sesion: conteos de ese lote_id entre el inicio de esta
  // sesion y el inicio de la siguiente (bordes reales, no end_time -- documentado
  // como poco confiable en este dispositivo). Para la ultima sesion (activa), sin
  // cota superior. Secuencial (no batcheado): el batching con VALUES para 621 filas
  // producia planes malos (bitmap sobre parametros correlacionados, igual que el
  // problema ya documentado en eval-cambios-lote.mjs); una query simple por sesion
  // con lote_id fijo + rango ts SI usa el indice (lote_id, ts) de forma eficiente.
  console.log("\n[4] Contando conteos originales por sesion (secuencial, index-seek por sesion)");
  const countByIdx = new Map();
  let doneC = 0;
  const tC0 = Date.now();
  for (let i = 0; i < sessions.length; i++) {
    doneC++;
    if (doneC % 100 === 0) {
      const el = (Date.now() - tC0) / 1000;
      console.log(`  progreso ${doneC}/${sessions.length} (${el.toFixed(0)}s)`);
    }
    const s = sessions[i];
    const nextStart = i < sessions.length - 1 ? sessions[i + 1].start_time : null;
    const r = nextStart
      ? await sql`select count(*)::int n from conteo where dispositivo_id=${DEVICE} and lote_id=${s.lote_id} and ts >= ${s.start_time} and ts < ${nextStart}`
      : await sql`select count(*)::int n from conteo where dispositivo_id=${DEVICE} and lote_id=${s.lote_id} and ts >= ${s.start_time}`;
    countByIdx.set(i, r[0].n);
  }
  console.log(`  listo (${sessions.length} sesiones, ${((Date.now() - tC0) / 1000).toFixed(0)}s)`);

  // ── Hoja 1: lote_session_corregido ──────────────────────────────────────────
  // clamp de seguridad final: aun con el recalculo acotado, dos transiciones
  // distintas podrian reclamar la misma ventana solapada (p.ej. sesion intermedia
  // muy corta entre dos transiciones vecinas); nunca se deja una sesion en negativo.
  console.log("\n[5] Construyendo hoja 1 (lote_session_corregido)");
  let clamps = 0;
  const correccionClampedPorSesion = new Map();
  const hoja1 = sessions.map((s, i) => {
    const original = countByIdx.get(i) ?? 0;
    let correccion = correccionPorSesion.get(s.id) || 0;
    if (original + correccion < 0) {
      correccion = -original;
      clamps++;
      addNota(s.id, `AJUSTADO: la correccion se topo en 0 (excedia el conteo original de esta sesion)`);
    }
    correccionClampedPorSesion.set(s.id, correccion);
    return {
      fecha_inicio: iso(s.start_time),
      fecha_fin_registrada: s.end_time ? iso(s.end_time) : "",
      codigo_lote: s.codigo_lote ?? "",
      conteo_original: original,
      correccion,
      conteo_corregido: original + correccion,
      notas: (notaPorSesion.get(s.id) || []).join(" | "),
    };
  });
  if (clamps) console.log(`  ${clamps} sesiones requirieron tope de seguridad (correccion excedia su propio conteo)`);

  // ── Hoja 2: total_por_lote, sesiones con start_time en [DESDE, HASTA] ───────
  console.log("\n[6] Construyendo hoja 2 (total_por_lote,", DESDE, "a", HASTA, ")");
  const desdeMs = new Date(DESDE + "T00:00:00Z").getTime();
  const hastaMs = new Date(HASTA + "T23:59:59Z").getTime();
  const enRango = sessions
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => { const t = new Date(s.start_time).getTime(); return t >= desdeMs && t <= hastaMs; });

  const porLote = new Map();
  for (const { s, i } of enRango) {
    const cod = s.codigo_lote ?? "(sin codigo)";
    if (!porLote.has(cod)) porLote.set(cod, { sesiones: 0, original: 0, corregido: 0 });
    const e = porLote.get(cod);
    const original = countByIdx.get(i) ?? 0;
    const correccion = correccionClampedPorSesion.get(s.id) || 0;
    e.sesiones += 1; e.original += original; e.corregido += original + correccion;
  }
  const hoja2 = [...porLote.entries()]
    .map(([codigo_lote, e]) => ({ codigo_lote, sesiones: e.sesiones, conteo_original: e.original, conteo_corregido: e.corregido, diferencia: e.corregido - e.original }))
    .sort((a, b) => b.conteo_corregido - a.conteo_corregido);
  console.log(`  ${hoja2.length} lotes en rango (${enRango.length} sesiones)`);

  // ── Hoja 3: comparacion_sap -- total LIFETIME (todas las sesiones, sin filtro de
  // fecha) por codigo_lote, contra el archivo SAP, antes y despues de la correccion.
  // El QB "original" restringido a bandas SAP +-1cm ya se calculo en fase 3 (v3) desde
  // lote_stats (por calibre); aqui se le suma la MISMA diferencia (corregido-original)
  // de conteo total, asumiendo que los conteos movidos mantienen aprox. la distribucion
  // de calibre propia del lote (aproximacion razonable: las correcciones tipicas son
  // <5% del total del lote) -- no se recalcula el desglose por calibre real.
  console.log("\n[7] Comparando contra SAP (antes/despues de la correccion)");
  const sapPath = path.join(process.env.HOME, "Downloads/REAL_conteos_sap_desde_04_06_2026.xlsx");
  const wbSap = XLSX.readFile(sapPath);
  const sapRows = XLSX.utils.sheet_to_json(wbSap.Sheets["Detalle_lote_calibre"]);
  const sapPorLote = new Map();
  for (const r of sapRows) {
    const [lo, hi] = String(r["Calibre"]).split("/").map(Number);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    if (!sapPorLote.has(r["Lote"])) sapPorLote.set(r["Lote"], { total: 0, lo: Infinity, hi: -Infinity });
    const e = sapPorLote.get(r["Lote"]);
    e.total += Number(r["Final acumulado 30.06"]) || 0;
    e.lo = Math.min(e.lo, lo); e.hi = Math.max(e.hi, hi);
  }
  const qbStats = await sql.unsafe(`
    select lo.codigo_lote, ls.calibre, ls.count_in
    from lote_stats ls join lote lo on lo.id = ls.lote_id
    where ls.dispositivo_id = '${DEVICE}'`);
  const qbPorLote = new Map();
  for (const r of qbStats) { if (!qbPorLote.has(r.codigo_lote)) qbPorLote.set(r.codigo_lote, []); qbPorLote.get(r.codigo_lote).push(r); }

  // totales lifetime (todas las sesiones) original/corregido por codigo_lote
  const lifetimePorLote = new Map();
  const loteIdsPorCodigo = new Map();
  sessions.forEach((s, i) => {
    const cod = s.codigo_lote ?? "(sin codigo)";
    if (!lifetimePorLote.has(cod)) lifetimePorLote.set(cod, { original: 0, corregido: 0 });
    const e = lifetimePorLote.get(cod);
    const original = countByIdx.get(i) ?? 0;
    const correccion = correccionClampedPorSesion.get(s.id) || 0;
    e.original += original; e.corregido += original + correccion;
    if (!loteIdsPorCodigo.has(cod)) loteIdsPorCodigo.set(cod, new Set());
    loteIdsPorCodigo.get(cod).add(s.lote_id);
  });

  // SAP es un corte al 30-06: un lote que sigue midiendose DESPUES de esa fecha va a
  // mostrar "deficit" simplemente porque SAP todavia no alcanza a registrar su produccion
  // -- no es un error de estampado. Se marca para no confundirlo con un residual real.
  const CUTOFF = new Date("2026-06-30T23:59:59Z").getTime();
  const ultimoConteoPorCodigo = new Map();
  for (const [cod, ids] of loteIdsPorCodigo) {
    if (!sapPorLote.has(cod)) continue; // solo interesa para los que se comparan con SAP
    let maxTs = null;
    for (const lid of ids) {
      const r = await sql`select ts from conteo where dispositivo_id=${DEVICE} and lote_id=${lid} order by ts desc limit 1`;
      if (r.length && (!maxTs || new Date(r[0].ts) > maxTs)) maxTs = new Date(r[0].ts);
    }
    ultimoConteoPorCodigo.set(cod, maxTs);
  }

  const hoja3 = [];
  for (const [cod, sap] of sapPorLote) {
    const qb = qbPorLote.get(cod);
    const lt = lifetimePorLote.get(cod);
    if (!qb || !sap.total || !lt) continue;
    const lo = sap.lo - 1, hi = sap.hi + 1;
    const qbBandasOriginal = qb.filter(x => x.calibre >= lo && x.calibre < hi).reduce((a, x) => a + x.count_in, 0);
    const deltaCorreccion = lt.corregido - lt.original; // ajuste neto propuesto para este lote (todas sus sesiones)
    const qbBandasCorregido = qbBandasOriginal + deltaCorreccion;
    const residualOriginal = qbBandasOriginal - sap.total;
    const residualCorregido = qbBandasCorregido - sap.total;
    const ultimoConteo = ultimoConteoPorCodigo.get(cod);
    const activoDespuesCorte = ultimoConteo && ultimoConteo.getTime() > CUTOFF;
    hoja3.push({
      codigo_lote: cod,
      sap_final_3006: sap.total,
      qb_bandas_original: qbBandasOriginal,
      residual_original: residualOriginal,
      residual_original_pct: Number((100 * residualOriginal / sap.total).toFixed(1)),
      correccion_neta_lote: deltaCorreccion,
      qb_bandas_corregido: qbBandasCorregido,
      residual_corregido: residualCorregido,
      residual_corregido_pct: Number((100 * residualCorregido / sap.total).toFixed(1)),
      mejora_abs: Math.abs(residualOriginal) - Math.abs(residualCorregido),
      ultimo_conteo: ultimoConteo ? iso(ultimoConteo) : "",
      aun_activo_despues_30_06: activoDespuesCorte,
      nota: activoDespuesCorte ? "produccion en curso mas alla del corte SAP: residual no es comparable todavia" : "",
    });
  }
  hoja3.sort((a, b) => b.mejora_abs - a.mejora_abs);
  const completos = hoja3.filter(r => !r.aun_activo_despues_30_06);
  const activos = hoja3.filter(r => r.aun_activo_despues_30_06);
  const mejoraTotal = hoja3.reduce((s, r) => s + r.mejora_abs, 0);
  const sumaAbsOriginal = hoja3.reduce((s, r) => s + Math.abs(r.residual_original), 0);
  const sumaAbsCorregido = hoja3.reduce((s, r) => s + Math.abs(r.residual_corregido), 0);
  const sumaAbsOriginalCompletos = completos.reduce((s, r) => s + Math.abs(r.residual_original), 0);
  const mejoraron = hoja3.filter(r => r.mejora_abs > 0).length, empeoraron = hoja3.filter(r => r.mejora_abs < 0).length;
  console.log(`  ${hoja3.length} lotes comparables (QB en bandas SAP + presentes en ambas fuentes)`);
  console.log(`  ${activos.length} todavia en produccion mas alla del 30-06 (residual no comparable aun): ${activos.map(r => r.codigo_lote).join(", ")}`);
  console.log(`  suma |residual| TODOS: antes=${Math.round(sumaAbsOriginal)} despues=${Math.round(sumaAbsCorregido)} (mejora neta: ${Math.round(mejoraTotal)})`);
  console.log(`  suma |residual| SOLO lotes ya terminados (${completos.length}): ${Math.round(sumaAbsOriginalCompletos)} -- esto es lo realmente comparable contra SAP`);
  console.log(`  lotes que mejoraron: ${mejoraron}  |  empeoraron: ${empeoraron}  |  sin cambio: ${hoja3.length - mejoraron - empeoraron}`);

  // ── escribir Excel ───────────────────────────────────────────────────────
  console.log("\n[8] Escribiendo Excel");
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(hoja1);
  ws1["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, "lote_session_corregido");
  const ws2 = XLSX.utils.json_to_sheet(hoja2);
  ws2["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "total_por_lote");
  const ws3 = XLSX.utils.json_to_sheet(hoja3);
  ws3["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, "comparacion_sap");
  const outPath = path.join(OUT, "lote_session_corregido.xlsx");
  XLSX.writeFile(wb, outPath);
  console.log(`  wrote ${outPath}`);
  console.log(`  hoja1: ${hoja1.length} filas | hoja2: ${hoja2.length} filas | hoja3: ${hoja3.length} filas`);

  await sql.end();
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
