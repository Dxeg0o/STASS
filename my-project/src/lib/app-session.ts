import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { caja, cajaLoteSession, dispositivo, loteSession } from "@/db/schema";
import { fetchLoteById, type LoteDTO } from "@/lib/app-lote";
import {
  serializeCaja,
  serializeCajaLoteSession,
  serializeLoteSession,
} from "@/lib/app-serialize";

export interface SessionSnapshotDTO {
  lote: LoteDTO | null;
  lote_sessions: ReturnType<typeof serializeLoteSession>[];
  caja: ReturnType<typeof serializeCaja> | null;
  caja_sessions: ReturnType<typeof serializeCajaLoteSession>[];
  caja_orden: number;
}

const EMPTY_SNAPSHOT: SessionSnapshotDTO = {
  lote: null,
  lote_sessions: [],
  caja: null,
  caja_sessions: [],
  caja_orden: 0,
};

// Número máximo de caja que ha tenido un lote a lo largo de sus lote_session.
// El código es la fuente de verdad del correlativo: contar filas distintas
// falla cuando hay reintentos, cajas compartidas por varios dispositivos o
// códigos no consecutivos.
export async function getCajaCountForLote(loteId: string): Promise<number> {
  const sessions = await db
    .select({ id: loteSession.id })
    .from(loteSession)
    .where(eq(loteSession.loteId, loteId));
  if (sessions.length === 0) return 0;

  const ids = sessions.map((s) => s.id);
  const cajaSessions = await db
    .select({ codigo: caja.codigo })
    .from(cajaLoteSession)
    .innerJoin(caja, eq(cajaLoteSession.cajaId, caja.id))
    .where(inArray(cajaLoteSession.loteSessionId, ids));

  const suffixes = cajaSessions
    .map((row) => row.codigo.match(/(\d+)$/)?.[1])
    .filter((suffix): suffix is string => Boolean(suffix))
    .map(Number)
    .filter(Number.isFinite);

  return suffixes.length > 0 ? Math.max(...suffixes) : 0;
}

function getCajaOrdenFromCodigo(codigo: string | null | undefined): number | null {
  const suffix = codigo?.match(/(\d+)$/)?.[1];
  if (!suffix) return null;
  const number = Number(suffix);
  return Number.isFinite(number) ? number : null;
}

// ─── Apertura exclusiva de lote_session ───────────────────────────────────
//
// Un dispositivo no puede tener dos lote_session abiertas a la vez. La
// atribución de conteos (ver /api/mediciones/sync) resuelve cada conteo
// buscando la sesión que contenga su `ts`, entre las del dispositivo ordenadas
// por start_time DESC, y se queda con la PRIMERA que matchea. O sea: con
// ventanas solapadas los conteos caen todos en la sesión que arrancó última, y
// una sesión que quedó abierta por error sigue capturando conteos de lotes
// posteriores indefinidamente.
//
// Antes el cierre lo decidía el cliente: la tablet cerraba las sesiones que
// tenía en su estado local y después abría la nueva, como dos requests
// independientes. Con dos tablets sobre los mismos dispositivos eso no puede
// funcionar — la tablet B no conoce los ids de las sesiones que abrió A, así
// que las dejaba abiertas. Y aun con una sola tablet, si el cierre fallaba y la
// apertura no (o al revés), quedaban huecos o solapamientos.
//
// Ahora la frontera es responsabilidad del servidor y se resuelve en una sola
// transacción, idempotente y sin depender de lo que el cliente crea recordar.

export interface OpenLoteSessionInput {
  id?: string;
  loteId: string;
  dispositivoId: string;
  startTime: Date;
}

export type OpenLoteSessionResult = {
  session: typeof loteSession.$inferSelect;
  /** La sesión ya existía con este id: fue un reintento del outbox. */
  alreadyExisted: boolean;
  /** Sesiones que esta apertura cerró, para poder loguearlo. */
  closedSessionIds: string[];
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Abre una `lote_session` cerrando atómicamente cualquier otra que el
 * dispositivo tuviera abierta, y garantizando que la ventana resultante no se
 * solape con las que ya existen.
 */
export async function openLoteSessionExclusiveInTransaction(
  tx: DbTransaction,
  input: OpenLoteSessionInput
): Promise<OpenLoteSessionResult> {
  const { id, loteId, dispositivoId, startTime } = input;

    // Reintento del outbox con el mismo id: la sesión ya está, y sus fronteras
    // ya se resolvieron cuando llegó la primera vez. No hay que volver a
    // cerrar nada (cerraríamos la sesión que vino después de esta).
    if (id) {
      const existing = await tx.query.loteSession.findFirst({
        where: eq(loteSession.id, id),
      });
      if (existing) {
        return { session: existing, alreadyExisted: true, closedSessionIds: [] };
      }
    }

    // Serializa todas las transiciones de este dispositivo. Sin esto, las dos
    // tablets pueden abrir sesiones a la vez y ambas ver "no hay ninguna
    // abierta", dejando el solapamiento que este helper existe para evitar.
    await tx
      .select({ id: dispositivo.id })
      .from(dispositivo)
      .where(eq(dispositivo.id, dispositivoId))
      .for("update");

    // Toda sesión cuya ventana contenga el nuevo inicio hay que recortarla. Son
    // dos casos: la abierta del cambio de lote normal, y una ya cerrada cuando
    // la apertura llega fuera de orden (la tablet está diciendo que a esa hora
    // la línea ya trabajaba otro lote, así que la frontera anterior estaba mal
    // puesta). Mirar sólo las abiertas dejaba la ventana nueva pisando a una
    // cerrada que la abarcaba.
    const toTruncate = await tx
      .select({
        id: loteSession.id,
        startTime: loteSession.startTime,
        endTime: loteSession.endTime,
      })
      .from(loteSession)
      .where(
        and(
          eq(loteSession.dispositivoId, dispositivoId),
          lte(loteSession.startTime, startTime),
          or(isNull(loteSession.endTime), gt(loteSession.endTime, startTime)),
          ...(id ? [ne(loteSession.id, id)] : [])
        )
      )
      .orderBy(asc(loteSession.startTime));

    // Puede haber varias abiertas a la vez: es el estado que dejó el bug (hay
    // dispositivos en producción con 7). Cerrarlas todas en el mismo instante
    // detiene la captura de conteos pero las deja solapadas entre sí, así que se
    // encadenan — cada una termina donde arranca la siguiente. Se encadenan sólo
    // las que están abiertas: un `end_time` nulo no aporta ninguna información,
    // mientras que uno ya puesto puede ser una pausa legítima y no se toca más
    // allá del recorte. Los `start_time`, que son la evidencia que usan los
    // scripts de reconstrucción, quedan intactos.
    const open = toTruncate.filter((s) => s.endTime === null);
    const closedSpanning = toTruncate.filter((s) => s.endTime !== null);

    for (let i = 0; i < open.length; i++) {
      const boundary = i + 1 < open.length ? open[i + 1].startTime : startTime;
      await tx
        .update(loteSession)
        .set({ endTime: boundary })
        .where(eq(loteSession.id, open[i].id));
    }
    for (const s of closedSpanning) {
      await tx
        .update(loteSession)
        .set({ endTime: startTime })
        .where(eq(loteSession.id, s.id));
    }

    const closed = toTruncate;

    // Llegada fuera de orden: ya existe una sesión posterior (las dos tablets
    // escriben, y el outbox puede reintentar en cualquier orden). La ventana
    // nueva se recorta para terminar donde empieza la siguiente, en vez de
    // pisarla.
    const [next] = await tx
      .select({ startTime: loteSession.startTime })
      .from(loteSession)
      .where(
        and(
          eq(loteSession.dispositivoId, dispositivoId),
          gt(loteSession.startTime, startTime),
          ...(id ? [ne(loteSession.id, id)] : [])
        )
      )
      .orderBy(asc(loteSession.startTime))
      .limit(1);

    const [created] = await tx
      .insert(loteSession)
      .values({
        ...(id ? { id } : {}),
        loteId,
        dispositivoId,
        startTime,
        ...(next ? { endTime: next.startTime } : {}),
      })
      .returning();

    return {
      session: created,
      alreadyExisted: false,
      closedSessionIds: closed.map((c) => c.id),
    };
}

export async function openLoteSessionExclusive(
  input: OpenLoteSessionInput
): Promise<OpenLoteSessionResult> {
  return db.transaction((tx) => openLoteSessionExclusiveInTransaction(tx, input));
}

/**
 * Abre sesiones exclusivas para varios dispositivos usando exactamente la
 * misma lógica que usa la app de tablet. Cada dispositivo se procesa como una
 * transición independiente, igual que las llamadas que hace qualiblick-app.
 */
export async function openLoteSessionsExclusive(
  inputs: OpenLoteSessionInput[]
): Promise<OpenLoteSessionResult[]> {
  const results: OpenLoteSessionResult[] = [];
  for (const input of inputs) {
    results.push(await openLoteSessionExclusive(input));
  }
  return results;
}

/**
 * Cierra una `lote_session` sin pisar una frontera ya resuelta.
 *
 * El cliente sigue encolando cierres explícitos, y con
 * [openLoteSessionExclusive] el servidor puede haber cerrado ya esa misma
 * sesión. Un cierre que llega tarde no debe mover un `end_time` correcto: si
 * ya está cerrada, se devuelve tal cual.
 */
export async function closeLoteSessionIdempotent(
  sessionId: string,
  endTime: Date
): Promise<typeof loteSession.$inferSelect | null> {
  const [updated] = await db
    .update(loteSession)
    .set({ endTime })
    .where(and(eq(loteSession.id, sessionId), isNull(loteSession.endTime)))
    .returning();

  if (updated) return updated;

  // O no existe, o ya estaba cerrada. Distinguir importa: lo primero es un 404,
  // lo segundo un éxito idempotente.
  const existing = await db.query.loteSession.findFirst({
    where: eq(loteSession.id, sessionId),
  });
  return existing ?? null;
}

// Mismo algoritmo que SupabaseService.getActiveSession: toma las
// lote_session abiertas (end_time IS NULL) de estos dispositivos, se queda
// con el lote más recientemente iniciado, y arma el snapshot completo
// (lote + sus sesiones + caja activa + cuántas cajas lleva el lote).
export async function getActiveSessionSnapshot(
  dispositivoIds: string[]
): Promise<SessionSnapshotDTO> {
  if (dispositivoIds.length === 0) return EMPTY_SNAPSHOT;

  const rawSessions = await db
    .select()
    .from(loteSession)
    .where(
      and(
        inArray(loteSession.dispositivoId, dispositivoIds),
        isNull(loteSession.endTime)
      )
    )
    .orderBy(desc(loteSession.startTime));

  if (rawSessions.length === 0) return EMPTY_SNAPSHOT;

  const activeLoteId = rawSessions[0].loteId;
  const activeSessions = rawSessions.filter((s) => s.loteId === activeLoteId);

  const lote = await fetchLoteById(activeLoteId);
  if (!lote) return EMPTY_SNAPSHOT;

  const sessionIds = activeSessions.map((s) => s.id);
  const rawCajaSessions = await db
    .select({ cajaLoteSession, caja })
    .from(cajaLoteSession)
    .leftJoin(caja, eq(cajaLoteSession.cajaId, caja.id))
    .where(
      and(
        inArray(cajaLoteSession.loteSessionId, sessionIds),
        isNull(cajaLoteSession.retiradoAt)
      )
    )
    .orderBy(desc(cajaLoteSession.asignadoAt));

  const cajaSessions = rawCajaSessions.map((r) =>
    serializeCajaLoteSession(r.cajaLoteSession)
  );
  const cajaActiva =
    rawCajaSessions.length > 0 && rawCajaSessions[0].caja
      ? serializeCaja(rawCajaSessions[0].caja)
      : null;

  // La tablet muestra este número junto a `caja`; por tanto debe representar
  // la caja activa visible, no el total histórico del lote. El endpoint
  // /cajas-count sigue usando getCajaCountForLote para numerar la próxima caja.
  const cajaOrden =
    getCajaOrdenFromCodigo(cajaActiva?.codigo) ??
    (await getCajaCountForLote(activeLoteId));

  return {
    lote,
    lote_sessions: activeSessions.map(serializeLoteSession),
    caja: cajaActiva,
    caja_sessions: cajaSessions,
    caja_orden: cajaOrden,
  };
}
