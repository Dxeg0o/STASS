// Fix de lote_session para Pelchuquin (ORIN-AGX-2).
//
// Reescribe las ventanas de lote_session usando como fuente la verdad de
// terreno (conteo.lote_id + conteo.ts). Reconstruye sesiones por gap-split de
// 3 min (micro-sesiones), solo para conteos con ts < CUTOFF (deja intacto el
// lote activo que sigue contando). NO mueve conteos ni toca stats.
//
// DRY-RUN por defecto: genera respaldos + ventanas objetivo + preflight.
// Para aplicar hace falta --apply --yes (implementado en un paso posterior).
//
//   node scripts/fix-lote-session-pelchuquin.mjs            # dry-run
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import postgres from "postgres";

config({ path: ".env.local" });

const SERVICIO = "0ed78e32-1ecf-45f6-ac4f-c93386d0a31d";
const DEVICE = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2
const GAP = "3 minutes";
// Inicio de la sesion activa (650.24C.STV, abierta). Solo se reconstruye < CUTOFF.
const CUTOFF = "2026-07-01T14:26:32.541795+00:00";
const ACTIVE_SESSION = "cb07c9cf-0f86-431e-a0f9-48d637e04c51";
const OUT = path.resolve("../outputs/fix_lote_session");

const apply = process.argv.includes("--apply");
const yes = process.argv.includes("--yes");

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
const sql = postgres(cs, { max: 1, idle_timeout: 10, connect_timeout: 10 });

function dump(name, data) {
  writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
  console.log(`  wrote ${name} (${Array.isArray(data) ? data.length + " filas" : "obj"})`);
}

// Backups que NO se sobrescriben si ya existen (protege el estado ORIGINAL).
function dumpOnce(name, data) {
  if (existsSync(path.join(OUT, name))) { console.log(`  keep ${name} (backup original ya existe)`); return; }
  dump(name, data);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`${apply ? "APPLY" : "DRY-RUN"} fix-lote-session Pelchuquin | CUTOFF=${CUTOFF} | gap=${GAP}`);
  await sql`set statement_timeout = '180s'`;

  // ── 1. Respaldos a JSON ──────────────────────────────────────────────────
  console.log("\n[1] Respaldos JSON");
  const bkSessions = await sql`
    select ls.id, ls.lote_id, lo.codigo_lote, ls.dispositivo_id, ls.start_time, ls.end_time
    from lote_session ls join lote lo on lo.id = ls.lote_id
    where ls.dispositivo_id = ${DEVICE} order by ls.start_time`;
  dumpOnce("backup_lote_session.json", bkSessions);

  const bkCajas = await sql`
    select cls.* from caja_lote_session cls
    join lote_session ls on ls.id = cls.lote_session_id
    where ls.dispositivo_id = ${DEVICE}`;
  dumpOnce("backup_caja_lote_session.json", bkCajas);

  const bkTotals = await sql`
    select * from lote_total_stats where servicio_id = ${SERVICIO}`;
  dumpOnce("backup_lote_total_stats.json", bkTotals);

  // ── 2. Ventanas objetivo: gap-split POR LOTE (colapsando cruces) ──────────
  // Una ventana por cada ocupacion continua del lote: gap-split de 3 min sobre
  // los conteos de ESE lote. Cubre el 100% de sus conteos por construccion. En
  // las zonas de interleave, dos lotes pueden tener ventanas que se solapan en
  // el tiempo (ambos estuvieron activos) -> se aceptan y se marcan.
  console.log("\n[2] Ventanas objetivo (gap-split por lote, colapsando cruces, < CUTOFF)");
  const norm = t => t.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  const loteIds = await sql`
    select distinct c.lote_id, lo.codigo_lote
    from lote_total_stats c join lote lo on lo.id = c.lote_id
    where c.servicio_id = ${SERVICIO} and c.dispositivo_id = ${DEVICE}`;
  const windows = [];
  for (const { lote_id, codigo_lote } of loteIds) {
    const runs = await sql`
      with d as (
        select c.ts, (c.ts - lag(c.ts) over (order by c.ts)) as delta
        from conteo c
        where c.servicio_id = ${SERVICIO} and c.dispositivo_id = ${DEVICE}
          and c.lote_id = ${lote_id} and c.ts < ${CUTOFF}
      ),
      flags as (
        select ts, sum(case when delta > interval '${sql.unsafe(GAP)}' then 1 else 0 end)
          over (order by ts rows unbounded preceding) as run_id
        from d
      )
      select min(ts) as start_ts, max(ts) as last_ts,
             min(ts)::text as start_txt, max(ts)::text as last_txt, count(*)::int as bulbos
      from flags group by run_id order by min(ts)`;
    for (const r of runs) windows.push({ lote_id, codigo_lote, ...r });
  }
  const sorted = [...windows].sort((a,b)=> new Date(a.start_ts)-new Date(b.start_ts));
  console.log(`  ${sorted.length} ventanas objetivo, ${new Set(sorted.map(w=>w.lote_id)).size} lotes`);

  // start = primer conteo (µs exactos); end = ultimo conteo + 1ms (cubre el
  // ultimo conteo aun con microsegundos). Sin recorte -> se permiten solapes.
  for (let i=0;i<sorted.length;i++){
    sorted[i].start_out = norm(sorted[i].start_txt);
    sorted[i].end_out = new Date(new Date(sorted[i].last_ts).getTime()+1).toISOString();
  }
  dump("target_windows.json", sorted.map(w=>({
    servicioId: SERVICIO, dispositivoId: DEVICE, loteId: w.lote_id,
    codigoLote: w.codigo_lote, startTs: w.start_out, endTs: w.end_out, bulbos: w.bulbos,
  })));

  // ── 3. Preflight ─────────────────────────────────────────────────────────
  console.log("\n[3] Preflight");
  // 3a. solapes entre ventanas objetivo
  let overlaps = 0, overlapDetail = [];
  for (let i=0;i<sorted.length-1;i++){
    for (let j=i+1;j<sorted.length;j++){
      if (new Date(sorted[j].start_out) >= new Date(sorted[i].end_out)) break;
      overlaps++; overlapDetail.push([sorted[i].codigo_lote, sorted[j].codigo_lote]);
    }
  }
  const pares = [...new Set(overlapDetail.map(p=>[p[0],p[1]].sort().join(" ↔ ")))];
  console.log(`  solapes entre ventanas objetivo (zonas de cruce, esperado): ${overlaps} | pares: ${pares.join(", ")}`);

  // 3b+3c. Cobertura POR LOTE (indexado): conteos < CUTOFF del lote que caen en
  //   alguna de SUS ventanas objetivo. Como el apply NO toca conteo, lo unico
  //   que importa es que cada conteo quede cubierto por una ventana de su lote.
  const winByLote = new Map();
  for (const w of sorted) {
    if (!winByLote.has(w.lote_id)) winByLote.set(w.lote_id, []);
    winByLote.get(w.lote_id).push(w);
  }
  let totalPre = 0n, cubiertos = 0n; const noCubre = [];
  for (const [lote_id, ws] of winByLote) {
    const vals = ws.map(w => `(timestamptz '${w.start_out}', timestamptz '${w.end_out}')`).join(",");
    const r = await sql`
      with w(s,e) as (values ${sql.unsafe(vals)})
      select
        (select count(*)::bigint from conteo c where c.servicio_id=${SERVICIO} and c.dispositivo_id=${DEVICE} and c.lote_id=${lote_id} and c.ts < ${CUTOFF}) as total,
        (select count(*)::bigint from conteo c join w on c.ts>=w.s and c.ts<w.e where c.servicio_id=${SERVICIO} and c.dispositivo_id=${DEVICE} and c.lote_id=${lote_id}) as cub`;
    totalPre += BigInt(r[0].total); cubiertos += BigInt(r[0].cub);
    if (BigInt(r[0].total) !== BigInt(r[0].cub))
      noCubre.push({ lote: ws[0].codigo_lote, total: r[0].total, cub: r[0].cub, faltan: Number(r[0].total)-Number(r[0].cub) });
  }
  console.log(`  cobertura: ${cubiertos} / ${totalPre} conteos dentro de su ventana`);
  if (noCubre.length) { console.log(`  lotes con conteos fuera de su ventana (interleave clip):`); console.table(noCubre); }
  else console.log(`  todos los conteos < CUTOFF quedan dentro de una ventana de su lote  OK`);
  console.log(`  NOTA: el apply solo reescribe lote_session; conteo/stats NO se tocan.`);

  // 3d. cajas afectadas si hubiera que borrar sesiones
  console.log(`  caja_lote_session bajo sesiones AGX-2: ${bkCajas.length}`);

  // ── 4. Mapeo CSV ─────────────────────────────────────────────────────────
  const byLote = new Map();
  for (const w of sorted){
    if (!byLote.has(w.codigo_lote)) byLote.set(w.codigo_lote, {n:0,bulbos:0,ini:w.start_out,fin:w.end_out});
    const e = byLote.get(w.codigo_lote); e.n++; e.bulbos+=w.bulbos;
    if (new Date(w.start_out)<new Date(e.ini)) e.ini=w.start_out;
    if (new Date(w.end_out)>new Date(e.fin)) e.fin=w.end_out;
  }
  const recByLote = new Map();
  for (const s of bkSessions){
    const k=s.codigo_lote; if(!recByLote.has(k)) recByLote.set(k,0); recByLote.set(k,recByLote.get(k)+1);
  }
  let csv = "codigo_lote,sesiones_registradas,sesiones_objetivo,bulbos_objetivo,inicio_objetivo,fin_objetivo\n";
  for (const [code,e] of [...byLote.entries()].sort((a,b)=>b[1].bulbos-a[1].bulbos)){
    csv += `${code ?? "(sin codigo)"},${recByLote.get(code)??0},${e.n},${e.bulbos},${e.ini},${e.fin}\n`;
  }
  writeFileSync(path.join(OUT,"mapeo_lotes_afectados.csv"), csv);
  console.log(`\n  wrote mapeo_lotes_afectados.csv (${byLote.size} lotes)`);

  if (!apply) {
    console.log("\nDRY-RUN completo. No se modifico nada. Revisar outputs/fix_lote_session/ antes de aplicar.");
    await sql.end();
    return;
  }
  if (!yes) { console.log("\n--apply requiere --yes. Abortado."); await sql.end(); return; }

  // ── 5. APPLY (UPDATE + INSERT, sin DELETE) ────────────────────────────────
  const allFlag = process.argv.includes("--all");
  const lotesArg = (process.argv.find(a=>a.startsWith("--lotes="))||"").split("=")[1];
  const TEST = ["2520.23C.TH","265.24C.ST","445.25.V4"];
  const scopeCodes = new Set(allFlag ? sorted.map(w=>w.codigo_lote) : (lotesArg? lotesArg.split(","): TEST));
  const tScope = sorted.filter(w=>scopeCodes.has(w.codigo_lote));
  const scopeLoteIds = [...new Set(tScope.map(w=>w.lote_id))];
  console.log(`\n[5] APPLY | scope=${allFlag?"TODOS":[...scopeCodes].join(",")} | ${tScope.length} ventanas objetivo`);

  const existing = await sql`
    select id, lote_id, start_time from lote_session
    where dispositivo_id=${DEVICE} and start_time < ${CUTOFF}
      and lote_id in ${sql(scopeLoteIds)} order by start_time`;
  // colas de filas existentes por lote
  const q = new Map();
  for (const e of existing) { if(!q.has(e.lote_id)) q.set(e.lote_id, []); q.get(e.lote_id).push(e); }
  const updates = [], inserts = [], unmatched = [];
  for (const t of tScope) {
    const qq = q.get(t.lote_id);
    if (qq && qq.length) updates.push({ id: qq.shift().id, lote_id: t.lote_id, start: t.start_out, end: t.end_out });
    else unmatched.push(t);
  }
  const leftover = []; for (const [,qq] of q) leftover.push(...qq);
  for (const t of unmatched) {
    if (leftover.length) updates.push({ id: leftover.shift().id, lote_id: t.lote_id, start: t.start_out, end: t.end_out });
    else inserts.push(t);
  }
  if (leftover.length) throw new Error(`Quedan ${leftover.length} filas existentes sin destino en el scope. Abortado.`);
  console.log(`  updates=${updates.length}  inserts=${inserts.length}  (deletes=0)`);

  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('fix_lote_session_pelchuquin'))`;
    for (const u of updates)
      await tx`update lote_session set lote_id=${u.lote_id}, start_time=${u.start}::timestamptz, end_time=${u.end}::timestamptz where id=${u.id}`;
    for (const i of inserts)
      await tx`insert into lote_session (lote_id, dispositivo_id, start_time, end_time)
               values (${i.lote_id}, ${DEVICE}, ${i.start_out}::timestamptz, ${i.end_out}::timestamptz)`;

    // ── validacion dentro de la txn (rollback si falla) ────────────────────
    for (const lid of scopeLoteIds) {
      const r = await tx`
        select
          (select count(*)::bigint from conteo c where c.dispositivo_id=${DEVICE} and c.lote_id=${lid} and c.ts < ${CUTOFF}) as total,
          (select count(*)::bigint from conteo c where c.dispositivo_id=${DEVICE} and c.lote_id=${lid} and c.ts < ${CUTOFF}
             and exists (select 1 from lote_session ls where ls.dispositivo_id=${DEVICE} and ls.lote_id=${lid}
                         and c.ts >= ls.start_time and c.ts < ls.end_time)) as cub`;
      if (r[0].total !== r[0].cub)
        throw new Error(`VALIDACION FALLO lote ${lid}: total=${r[0].total} cubiertos=${r[0].cub} -> ROLLBACK`);
    }
    // conteos intactos: el total del servicio no cambia (no tocamos conteo)
    console.log(`  validacion OK: cobertura 100% por lote en el scope. Commit.`);
  });

  // chequeo post-commit: sesiones abiertas del device (solo informativo)
  const open = await sql`select count(*)::int n from lote_session where dispositivo_id=${DEVICE} and end_time is null`;
  console.log(`  sesiones abiertas en AGX-2 tras apply: ${open[0].n} (debe ser 1 = lote activo, salvo colgadas fuera de scope)`);
  console.log("\nAPPLY completo.");
  await sql.end();
}

main().catch(async (e)=>{ console.error(e); await sql.end(); process.exit(1); });
