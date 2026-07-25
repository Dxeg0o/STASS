// Verifica que la apertura de lote_session no pueda dejar ventanas solapadas.
//
// Reproduce, contra el esquema real, los escenarios que rompían con el cierre
// decidido por el cliente:
//
//   1. dos tablets sobre el MISMO dispositivo, una cambia de lote
//   2. reintento del outbox con el mismo id (idempotencia)
//   3. llegada fuera de orden (una sesión posterior ya existe)
//   4. dos aperturas concurrentes (la que serializa el FOR UPDATE)
//
// TODO CORRE DENTRO DE UNA TRANSACCIÓN QUE SIEMPRE HACE ROLLBACK. No deja nada
// escrito: ni sesiones, ni cierres, ni el lote/dispositivo de prueba. Lo único
// que toca de la base real es el esquema (lectura) y un lock breve sobre la fila
// del dispositivo de prueba, que se crea y se descarta acá mismo.
//
//   node scripts/verify-lote-session-exclusive.mjs
//
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const cs = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
if (!cs) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const sql = postgres(cs, { max: 2, idle_timeout: 10, connect_timeout: 10 });

let pass = 0;
let fail = 0;

function check(label, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`  ok   ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// Réplica exacta de openLoteSessionExclusive() en src/lib/app-session.ts.
// Si cambia el helper, tiene que cambiar acá.
async function openExclusive(tx, { id, loteId, dispositivoId, startTime }) {
  if (id) {
    const [existing] = await tx`
      select * from lote_session where id = ${id}`;
    if (existing) return { session: existing, alreadyExisted: true, closed: [] };
  }

  await tx`select id from dispositivo where id = ${dispositivoId} for update`;

  const toTruncate = await tx`
    select id, start_time, end_time from lote_session
    where dispositivo_id = ${dispositivoId}
      and start_time <= ${startTime}
      and (end_time is null or end_time > ${startTime})
      ${id ? sql`and id <> ${id}` : sql``}
    order by start_time asc`;

  const open = toTruncate.filter((s) => s.end_time === null);
  const closedSpanning = toTruncate.filter((s) => s.end_time !== null);

  for (let i = 0; i < open.length; i++) {
    const boundary = i + 1 < open.length ? open[i + 1].start_time : startTime;
    await tx`update lote_session set end_time = ${boundary} where id = ${open[i].id}`;
  }
  for (const s of closedSpanning) {
    await tx`update lote_session set end_time = ${startTime} where id = ${s.id}`;
  }

  const closed = toTruncate;

  const [next] = await tx`
    select start_time from lote_session
    where dispositivo_id = ${dispositivoId}
      and start_time > ${startTime}
      ${id ? sql`and id <> ${id}` : sql``}
    order by start_time asc limit 1`;

  const [created] = await tx`
    insert into lote_session ${tx({
      ...(id ? { id } : {}),
      lote_id: loteId,
      dispositivo_id: dispositivoId,
      start_time: startTime,
      end_time: next ? next.start_time : null,
    })} returning *`;

  return { session: created, alreadyExisted: false, closed: closed.map((c) => c.id) };
}

// Réplica de closeLoteSessionIdempotent().
async function closeIdempotent(tx, sessionId, endTime) {
  const [updated] = await tx`
    update lote_session set end_time = ${endTime}
    where id = ${sessionId} and end_time is null
    returning *`;
  if (updated) return updated;
  const [existing] = await tx`select * from lote_session where id = ${sessionId}`;
  return existing ?? null;
}

/** Sesiones del dispositivo, ordenadas, para poder afirmar sobre las ventanas. */
async function windows(tx, dispositivoId) {
  return tx`
    select id, lote_id, start_time, end_time from lote_session
    where dispositivo_id = ${dispositivoId} order by start_time asc`;
}

/** Cualquier par de ventanas que se pise. Es la propiedad que importa. */
function overlaps(rows) {
  const bad = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (a.end_time === null || new Date(a.end_time) > new Date(b.start_time)) {
      bad.push([a.id, b.id]);
    }
  }
  return bad;
}

/**
 * La misma resolución que usa /api/mediciones/sync: entre las sesiones del
 * dispositivo ordenadas por start_time DESC, la PRIMERA que contiene el ts.
 */
function attribute(rows, ts) {
  const desc = [...rows].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const hit = desc.find(
    (s) =>
      new Date(ts) >= new Date(s.start_time) &&
      (s.end_time === null || new Date(ts) < new Date(s.end_time))
  );
  return hit ? hit.lote_id : null;
}

const T = (min) => new Date(Date.UTC(2026, 0, 1, 12, min, 0));

async function main() {
  console.log("verify-lote-session-exclusive (ROLLBACK garantizado)\n");

  // El rollback del bloque exterior descarta absolutamente todo lo de abajo.
  await sql
    .begin(async (tx) => {
      // ── Datos de prueba, descartados con el rollback ──────────────────────
      const [empresa] = await tx`
        insert into empresa ${tx({ nombre: "__verify_tmp__" })} returning id`;
      const [disp] = await tx`
        insert into dispositivo ${tx({
          nombre: "__verify_tmp__",
          tipo: "tablet",
          activo: true,
        })} returning id`;
      const [loteX] = await tx`
        insert into lote ${tx({ codigo_lote: "__VX__", empresa_id: empresa.id })} returning id`;
      const [loteY] = await tx`
        insert into lote ${tx({ codigo_lote: "__VY__", empresa_id: empresa.id })} returning id`;
      const [loteZ] = await tx`
        insert into lote ${tx({ codigo_lote: "__VZ__", empresa_id: empresa.id })} returning id`;

      const D = disp.id;

      // ── 1. Dos tablets, mismo dispositivo, una cambia de lote ────────────
      console.log("[1] dos tablets sobre el mismo dispositivo");
      const a = await openExclusive(tx, {
        loteId: loteX.id,
        dispositivoId: D,
        startTime: T(0),
      });
      // La tablet B abre el lote Y sin conocer el id de la sesión de A.
      const b = await openExclusive(tx, {
        loteId: loteY.id,
        dispositivoId: D,
        startTime: T(10),
      });
      let rows = await windows(tx, D);
      check("cierra la sesión de la otra tablet", b.closed.includes(a.session.id));
      check("sin ventanas solapadas", overlaps(rows).length === 0, JSON.stringify(overlaps(rows)));
      check("conteo antes del cambio va al lote X", attribute(rows, T(5)) === loteX.id);
      check("conteo después del cambio va al lote Y", attribute(rows, T(15)) === loteY.id);

      // ── 2. Reintento del outbox con el mismo id ──────────────────────────
      console.log("[2] reintento del outbox (idempotencia)");
      const retryId = b.session.id;
      const retry = await openExclusive(tx, {
        id: retryId,
        loteId: loteY.id,
        dispositivoId: D,
        startTime: T(10),
      });
      rows = await windows(tx, D);
      check("devuelve la sesión existente", retry.alreadyExisted === true);
      check("no cierra nada de más", retry.closed.length === 0);
      check("no duplica sesiones", rows.length === 2, `${rows.length} filas`);
      check("sigue sin solapamientos", overlaps(rows).length === 0);

      // ── 3. Llegada fuera de orden ────────────────────────────────────────
      console.log("[3] apertura que llega fuera de orden");
      // Llega una apertura de las 12:05, cuando la de las 12:10 ya está.
      const late = await openExclusive(tx, {
        loteId: loteZ.id,
        dispositivoId: D,
        startTime: T(5),
      });
      rows = await windows(tx, D);
      check(
        "la ventana tardía se recorta y no pisa la siguiente",
        late.session.end_time !== null &&
          new Date(late.session.end_time).getTime() === T(10).getTime(),
        `end_time=${late.session.end_time}`
      );
      check("sin solapamientos tras la llegada tardía", overlaps(rows).length === 0,
        JSON.stringify(overlaps(rows)));
      check(
        "recorta la ventana anterior que abarcaba ese instante",
        late.closed.includes(a.session.id),
        `cerró ${JSON.stringify(late.closed)}`
      );
      // Lo que en definitiva importa: a qué lote se le imputa cada conteo.
      check("conteo en T+2 sigue en el lote X", attribute(rows, T(2)) === loteX.id);
      check("conteo en T+7 pasa al lote Z", attribute(rows, T(7)) === loteZ.id);
      check("conteo en T+15 sigue en el lote Y", attribute(rows, T(15)) === loteY.id);

      // ── 4. Cierre idempotente ────────────────────────────────────────────
      console.log("[4] cierre que llega tarde");
      const before = rows.find((r) => r.id === a.session.id);
      const reclosed = await closeIdempotent(tx, a.session.id, T(30));
      check(
        "no mueve un end_time ya resuelto",
        new Date(reclosed.end_time).getTime() === new Date(before.end_time).getTime(),
        `antes=${before.end_time} después=${reclosed.end_time}`
      );
      const missing = await closeIdempotent(tx, "00000000-0000-0000-0000-000000000000", T(30));
      check("una sesión inexistente devuelve null (404)", missing === null);

      // ── 5. Estado final coherente ────────────────────────────────────────
      console.log("[5] invariante final");
      rows = await windows(tx, D);
      const abiertas = rows.filter((r) => r.end_time === null);
      check("queda exactamente una sesión abierta", abiertas.length === 1,
        `${abiertas.length} abiertas`);
      check("la abierta es la última en el tiempo",
        abiertas[0] && abiertas[0].id === rows[rows.length - 1].id);

      // ── 6. Auto-sanado de sesiones apiladas ──────────────────────────────
      // El estado que dejó el bug: varias sesiones abiertas a la vez sobre el
      // mismo dispositivo (en producción hay uno con 7). El próximo cambio de
      // lote tiene que dejarlas encadenadas, no todas terminando en el mismo
      // instante, que las dejaría solapadas entre sí.
      console.log("[6] auto-sanado de sesiones apiladas");
      const [disp2] = await tx`
        insert into dispositivo ${tx({
          nombre: "__verify_tmp2__",
          tipo: "tablet",
          activo: true,
        })} returning id`;
      const D2 = disp2.id;
      for (const [lote, min] of [
        [loteX.id, 0],
        [loteY.id, 5],
        [loteZ.id, 12],
      ]) {
        await tx`insert into lote_session ${tx({
          lote_id: lote,
          dispositivo_id: D2,
          start_time: T(min),
          end_time: null,
        })}`;
      }
      let apiladas = await windows(tx, D2);
      check("arranca con 3 abiertas y solapadas",
        apiladas.filter((r) => r.end_time === null).length === 3 &&
          overlaps(apiladas).length > 0);

      await openExclusive(tx, { loteId: loteX.id, dispositivoId: D2, startTime: T(20) });
      apiladas = await windows(tx, D2);
      check("tras un cambio de lote no queda ningún solapamiento",
        overlaps(apiladas).length === 0, JSON.stringify(overlaps(apiladas)));
      check("queda una sola abierta",
        apiladas.filter((r) => r.end_time === null).length === 1);
      check("las ventanas quedan encadenadas",
        apiladas[0].end_time &&
          new Date(apiladas[0].end_time).getTime() === T(5).getTime(),
        `end_time=${apiladas[0].end_time}`);
      check("los start_time (la evidencia) quedan intactos",
        apiladas.map((r) => new Date(r.start_time).getTime()).join(",") ===
          [T(0), T(5), T(12), T(20)].map((d) => d.getTime()).join(","));

      // Fuerza el descarte de todo lo anterior.
      throw new Error("__ROLLBACK_INTENCIONAL__");
    })
    .catch((e) => {
      if (e.message !== "__ROLLBACK_INTENCIONAL__") throw e;
    });

  // Aperturas concurrentes: no se puede probar dentro de una sola transacción
  // (haría falta commitear en prod). Lo cubre el `select ... for update` sobre
  // la fila del dispositivo, que serializa las transiciones y evita que las dos
  // tablets vean a la vez "no hay ninguna sesión abierta".
  console.log("\n[7] aperturas concurrentes: cubiertas por el FOR UPDATE (no probado acá)");

  console.log(`\n${pass} ok, ${fail} fail`);
  console.log("Nada quedó escrito: la transacción hizo rollback.");
  await sql.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("\nError:", e.message);
  await sql.end();
  process.exit(1);
});
