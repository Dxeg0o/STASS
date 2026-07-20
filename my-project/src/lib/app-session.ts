import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { caja, cajaLoteSession, loteSession } from "@/db/schema";
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

// Cuántas cajas distintas ha tenido un lote a lo largo de todas sus
// lote_session — usado para numerar la próxima caja (mismo criterio que
// SupabaseService.getCajaCountForLote).
export async function getCajaCountForLote(loteId: string): Promise<number> {
  const sessions = await db
    .select({ id: loteSession.id })
    .from(loteSession)
    .where(eq(loteSession.loteId, loteId));
  if (sessions.length === 0) return 0;

  const ids = sessions.map((s) => s.id);
  const cajaSessions = await db
    .select({ cajaId: cajaLoteSession.cajaId })
    .from(cajaLoteSession)
    .where(inArray(cajaLoteSession.loteSessionId, ids));

  return new Set(cajaSessions.map((c) => c.cajaId)).size;
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

  const cajaOrden = await getCajaCountForLote(activeLoteId);

  return {
    lote,
    lote_sessions: activeSessions.map(serializeLoteSession),
    caja: cajaActiva,
    caja_sessions: cajaSessions,
    caja_orden: cajaOrden,
  };
}
