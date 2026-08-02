// Fix del cruce de salidas en "Planting Stock Pelu" (servicio 1fb2d8f5-...).
//
// La salida es solo una etiqueta en dispositivo_servicio (salida_orden /
// salida_nombre); todo el dato duro (conteo, tramos de lote_cierre_calibre_bin,
// lote_calibre_declarado_dia) cuelga de dispositivo_id. Las salidas 2 y 3
// quedaron cruzadas: la 2 apuntaba a ORIN-AGX-1 y la 3 a ORIN-AGX-2, cuando en
// terreno la salida 2 es la AGX-2 y la 3 es la AGX-1.
//
// Como la tablet lista las salidas y postea el dispositivo_id de la que eligio
// el operador, las declaraciones de calibre quedaron pegadas al dispositivo
// equivocado. Por eso hay que hacer DOS cosas:
//   1. intercambiar dispositivo_id de los tramos entre AGX-1 y AGX-2, y
//   2. intercambiar las etiquetas de salida (y de paso configurar ORIN-NANO-1
//      como salida 4, que estaba en NULL).
// Los conteos NO se tocan: cada AGX conto su propia linea correctamente.
//
// ORIN-NANO-1 no necesita mover tramos: al no tener salida_orden, la tablet
// mostraba el nombre del dispositivo, asi que sus declaraciones ya estaban bien.
//
// DRY-RUN por defecto: respaldos + antes/despues. Aplicar requiere --apply --yes.
//
//   node scripts/fix-salidas-pelu.mjs              # dry-run
//   node scripts/fix-salidas-pelu.mjs --apply --yes
//
import { config } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import postgres from "postgres";

config({ path: ".env.local" });

const SERVICIO = "1fb2d8f5-c66c-4069-a78a-5e98d403c1a1"; // Planting Stock Pelu
const AGX1 = "6ae37bf1-e415-4a84-9324-ea34fbf31cfc"; // ORIN-AGX-1 -> salida 3
const AGX2 = "ab1ab1d2-14ff-4048-a36e-f9a24ae9e688"; // ORIN-AGX-2 -> salida 2
const NANO1 = "2453bd09-5bf9-42bb-b55b-433cc52a71dc"; // ORIN-NANO-1 -> salida 4
const THOR1 = "10fa67db-a812-4455-812d-fdff6bdc478e"; // THOR-1 -> salida 1 (intacto)

// Mapeo objetivo completo de salidas del servicio.
const SALIDAS = [
  { id: THOR1, nombre: "THOR-1", orden: 1 },
  { id: AGX2, nombre: "ORIN-AGX-2", orden: 2 },
  { id: AGX1, nombre: "ORIN-AGX-1", orden: 3 },
  { id: NANO1, nombre: "ORIN-NANO-1", orden: 4 },
];

const OUT = path.resolve("../outputs/fix_salidas_pelu");

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
  if (existsSync(path.join(OUT, name))) {
    console.log(`  keep ${name} (backup original ya existe)`);
    return;
  }
  dump(name, data);
}

const rango = (from, to) =>
  from === null && to === null ? "?" : `${from ?? ""}-${to ?? ""}`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(
    `${apply ? "APPLY" : "DRY-RUN"} fix-salidas Pelu | servicio=${SERVICIO}`
  );
  await sql`set statement_timeout = '180s'`;

  // ── 1. Respaldos JSON ────────────────────────────────────────────────────
  console.log("\n[1] Respaldos JSON");
  const bkAsign = await sql`
    select ds.*, d.nombre as dispositivo_nombre
    from dispositivo_servicio ds
    join dispositivo d on d.id = ds.dispositivo_id
    where ds.servicio_id = ${SERVICIO}
    order by ds.salida_orden nulls last, d.nombre`;
  dumpOnce("backup_dispositivo_servicio.json", bkAsign);

  const bkTramos = await sql`
    select t.*, d.nombre as dispositivo_nombre, lo.codigo_lote
    from lote_cierre_calibre_bin t
    join dispositivo d on d.id = t.dispositivo_id
    left join lote lo on lo.id = t.lote_id
    where t.servicio_id = ${SERVICIO}
      and t.dispositivo_id in (${AGX1}, ${AGX2})
    order by lo.codigo_lote, d.nombre, t.created_at`;
  dumpOnce("backup_tramos.json", bkTramos);

  const bkDia = await sql`
    select x.*, d.nombre as dispositivo_nombre
    from lote_calibre_declarado_dia x
    join dispositivo d on d.id = x.dispositivo_id
    where x.servicio_id = ${SERVICIO}
    order by x.dia, d.nombre, x.calibre_key`;
  dumpOnce("backup_declarado_dia.json", bkDia);

  // ── 2. Estado actual de las salidas ──────────────────────────────────────
  console.log("\n[2] Salidas configuradas hoy (asignaciones vigentes)");
  const vigentes = bkAsign.filter((a) => a.fecha_termino === null);
  console.table(
    vigentes.map((a) => ({
      dispositivo: a.dispositivo_nombre,
      salida_orden: a.salida_orden,
      salida_nombre: a.salida_nombre,
      objetivo: SALIDAS.find((s) => s.id === a.dispositivo_id)?.orden ?? "—",
    }))
  );

  for (const s of SALIDAS) {
    if (!vigentes.some((a) => a.dispositivo_id === s.id)) {
      throw new Error(
        `${s.nombre} no tiene asignacion vigente en el servicio. Abortado.`
      );
    }
  }

  // ── 3. Antes/despues de los tramos ───────────────────────────────────────
  console.log("\n[3] Tramos a intercambiar (AGX-1 <-> AGX-2)");
  const porLote = new Map();
  for (const t of bkTramos) {
    if (!porLote.has(t.lote_id)) {
      porLote.set(t.lote_id, { codigo: t.codigo_lote, agx1: null, agx2: null });
    }
    const e = porLote.get(t.lote_id);
    if (t.dispositivo_id === AGX1) e.agx1 = t;
    else e.agx2 = t;
  }

  let csv =
    "codigo_lote,lote_id,agx1_antes,agx1_despues,agx2_antes,agx2_despues\n";
  const filas = [];
  for (const [loteId, e] of porLote) {
    const a1 = e.agx1 ? rango(e.agx1.calibre_from, e.agx1.calibre_to) : "—";
    const a2 = e.agx2 ? rango(e.agx2.calibre_from, e.agx2.calibre_to) : "—";
    filas.push({
      lote: e.codigo ?? loteId.slice(0, 8),
      "AGX-1 antes": a1,
      "AGX-1 despues": a2,
      "AGX-2 antes": a2,
      "AGX-2 despues": a1,
    });
    csv += `${e.codigo ?? ""},${loteId},${a1},${a2},${a2},${a1}\n`;
  }
  writeFileSync(path.join(OUT, "antes_despues.csv"), csv);
  console.table(filas);
  console.log(
    `  ${bkTramos.length} tramos en ${porLote.size} lotes  |  wrote antes_despues.csv`
  );

  // ── 4. Impacto en lote_calibre_declarado_dia ─────────────────────────────
  console.log("\n[4] Unidades declaradas hoy por dispositivo (AGX-1/AGX-2)");
  const impacto = bkDia.filter(
    (x) => x.dispositivo_id === AGX1 || x.dispositivo_id === AGX2
  );
  const agg = new Map();
  for (const x of impacto) {
    const k = `${x.dispositivo_nombre}|${x.calibre_key}`;
    agg.set(k, (agg.get(k) ?? 0n) + BigInt(x.unidades));
  }
  console.table(
    [...agg.entries()].map(([k, v]) => {
      const [dispositivo, calibre_key] = k.split("|");
      return { dispositivo, calibre_key, unidades: v.toString() };
    })
  );

  const loteIds = [...porLote.keys()];

  if (!apply) {
    console.log(
      "\nDRY-RUN completo. No se modifico nada. Revisar outputs/fix_salidas_pelu/ antes de aplicar."
    );
    await sql.end();
    return;
  }
  if (!yes) {
    console.log("\n--apply requiere --yes. Abortado.");
    await sql.end();
    return;
  }

  // ── 5. APPLY ─────────────────────────────────────────────────────────────
  console.log(`\n[5] APPLY | ${bkTramos.length} tramos, ${loteIds.length} lotes`);

  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('fix_salidas_pelu'))`;

    // 5a. Swap de tramos. La constraint lcc_sin_solape (EXCLUDE gist, no
    // deferrable) se evalua fila a fila, y con vigencia NULL el rango es
    // (-inf,inf), asi que un UPDATE ... SET dispositivo_id = CASE ... chocaria a
    // mitad de camino. Delete + reinsert conservando id/created_at/tablet_id.
    const vivos = await tx`
      select * from lote_cierre_calibre_bin
      where servicio_id = ${SERVICIO} and dispositivo_id in (${AGX1}, ${AGX2})`;
    if (vivos.length !== bkTramos.length) {
      throw new Error(
        `Los tramos cambiaron desde el respaldo (${bkTramos.length} -> ${vivos.length}). ROLLBACK.`
      );
    }

    await tx`
      delete from lote_cierre_calibre_bin
      where servicio_id = ${SERVICIO} and dispositivo_id in (${AGX1}, ${AGX2})`;

    for (const t of vivos) {
      await tx`
        insert into lote_cierre_calibre_bin
          (id, lote_id, servicio_id, dispositivo_id, calibre_from, calibre_to,
           bins, tablet_id, vigente_desde, vigente_hasta, created_at, updated_at)
        values (
          ${t.id}, ${t.lote_id}, ${t.servicio_id},
          ${t.dispositivo_id === AGX1 ? AGX2 : AGX1},
          ${t.calibre_from}, ${t.calibre_to}, ${t.bins}, ${t.tablet_id},
          ${t.vigente_desde}, ${t.vigente_hasta}, ${t.created_at}, now()
        )`;
    }
    console.log(`  tramos reasignados: ${vivos.length}`);

    // 5b. Swap de etiquetas. El indice parcial dispositivo_servicio_salida_uq
    // (servicio_id, salida_orden) obliga a limpiar antes de reasignar.
    await tx`
      update dispositivo_servicio
      set salida_orden = null, salida_nombre = null
      where servicio_id = ${SERVICIO} and fecha_termino is null`;
    for (const s of SALIDAS) {
      await tx`
        update dispositivo_servicio
        set salida_orden = ${s.orden}, salida_nombre = ${"Salida " + s.orden}
        where servicio_id = ${SERVICIO}
          and dispositivo_id = ${s.id}
          and fecha_termino is null`;
    }
    console.log(`  salidas reconfiguradas: ${SALIDAS.length}`);

    // 5c. Recalculo del resumen diario por lote afectado.
    for (const loteId of loteIds) {
      await tx`select refresh_lote_calibre_declarado_dia(${loteId}::uuid, ${SERVICIO}::uuid)`;
    }
    console.log(`  refresh_lote_calibre_declarado_dia: ${loteIds.length} lotes`);

    // ── 6. Validacion dentro de la txn (rollback si falla) ─────────────────
    const conteoTramos = await tx`
      select dispositivo_id, count(*)::int as n
      from lote_cierre_calibre_bin
      where servicio_id = ${SERVICIO} and dispositivo_id in (${AGX1}, ${AGX2})
      group by dispositivo_id`;
    const nAntes = new Map();
    for (const t of bkTramos) {
      nAntes.set(t.dispositivo_id, (nAntes.get(t.dispositivo_id) ?? 0) + 1);
    }
    for (const r of conteoTramos) {
      const esperado = nAntes.get(r.dispositivo_id === AGX1 ? AGX2 : AGX1) ?? 0;
      if (r.n !== esperado) {
        throw new Error(
          `VALIDACION FALLO: ${r.dispositivo_id} tiene ${r.n} tramos, se esperaban ${esperado}. ROLLBACK.`
        );
      }
    }

    const dups = await tx`
      select lote_id, dispositivo_id, count(*)::int as n
      from lote_cierre_calibre_bin
      where servicio_id = ${SERVICIO} and dispositivo_id is not null
      group by lote_id, dispositivo_id having count(*) > 1`;
    if (dups.length > 0) {
      throw new Error(
        `VALIDACION FALLO: ${dups.length} pares (lote, dispositivo) con tramos duplicados. ROLLBACK.`
      );
    }

    const salidasPost = await tx`
      select dispositivo_id, salida_orden, salida_nombre
      from dispositivo_servicio
      where servicio_id = ${SERVICIO} and fecha_termino is null
        and salida_orden is not null
      order by salida_orden`;
    if (salidasPost.length !== SALIDAS.length) {
      throw new Error(
        `VALIDACION FALLO: ${salidasPost.length} salidas configuradas, se esperaban ${SALIDAS.length}. ROLLBACK.`
      );
    }
    salidasPost.forEach((r, i) => {
      const esperado = SALIDAS[i];
      if (r.salida_orden !== esperado.orden || r.dispositivo_id !== esperado.id) {
        throw new Error(
          `VALIDACION FALLO: salida ${r.salida_orden} apunta a ${r.dispositivo_id}, se esperaba ${esperado.orden}->${esperado.nombre}. ROLLBACK.`
        );
      }
    });

    // El fix solo mueve unidades entre calibre_key, nunca crea ni pierde
    // conteos. No se compara contra el snapshot previo de
    // lote_calibre_declarado_dia porque ese snapshot esta desactualizado (la
    // linea sigue contando y el refresh incorpora conteos nuevos, incluso de
    // dispositivos que este fix no toca). La referencia es conteo, que es
    // invariante al swap de tramos.
    const baseline = await tx`
      select lote_id, dispositivo_id, count(*)::bigint as total
      from conteo
      where servicio_id = ${SERVICIO} and lote_id in ${tx(loteIds)}
      group by lote_id, dispositivo_id`;
    const esperado = new Map(
      baseline.map((r) => [`${r.lote_id}|${r.dispositivo_id}`, BigInt(r.total)])
    );
    const totalesPost = await tx`
      select lote_id, dispositivo_id, sum(unidades)::bigint as total
      from lote_calibre_declarado_dia
      where servicio_id = ${SERVICIO} and lote_id in ${tx(loteIds)}
      group by lote_id, dispositivo_id`;
    if (totalesPost.length !== esperado.size) {
      throw new Error(
        `VALIDACION FALLO: ${totalesPost.length} pares (lote, dispositivo) en el resumen, en conteo hay ${esperado.size}. ROLLBACK.`
      );
    }
    for (const r of totalesPost) {
      const k = `${r.lote_id}|${r.dispositivo_id}`;
      if (BigInt(r.total) !== (esperado.get(k) ?? -1n)) {
        throw new Error(
          `VALIDACION FALLO: lote ${r.lote_id} / ${r.dispositivo_id} declara ${r.total} unidades y en conteo hay ${esperado.get(k)}. ROLLBACK.`
        );
      }
    }

    console.log("  validacion OK. Commit.");
  });

  // ── 7. Estado final ──────────────────────────────────────────────────────
  const post = await sql`
    select d.nombre as dispositivo, x.calibre_key, sum(x.unidades)::bigint as unidades
    from lote_calibre_declarado_dia x
    join dispositivo d on d.id = x.dispositivo_id
    where x.servicio_id = ${SERVICIO} and x.dispositivo_id in (${AGX1}, ${AGX2})
    group by 1, 2 order by 1, 2`;
  console.log("\n[6] Unidades declaradas tras el fix");
  console.table(post.map((r) => ({ ...r, unidades: r.unidades.toString() })));

  console.log("\nAPPLY completo.");
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
