import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  cajaLoteSession,
  dispositivoServicio,
  lote,
  loteServicio,
  loteSession,
  servicio,
} from "@/db/schema";
import { openLoteSessionExclusiveInTransaction } from "@/lib/app-session";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ActiveLoteCandidate = {
  id: string;
  codigoLote: string | null;
};

export type AssignDeviceResult =
  | { kind: "selection_required"; activeLotes: ActiveLoteCandidate[] }
  | {
      kind: "assigned";
      assignment: typeof dispositivoServicio.$inferSelect;
      joinedActiveLote: boolean;
      loteSession: typeof loteSession.$inferSelect | null;
    };

async function findActiveLotes(
  tx: DbTransaction,
  servicioId: string,
  excludedDeviceId: string
): Promise<ActiveLoteCandidate[]> {
  const rows = await tx
    .select({
      id: lote.id,
      codigoLote: lote.codigoLote,
      dispositivoId: loteSession.dispositivoId,
    })
    .from(loteSession)
    .innerJoin(loteServicio, eq(loteServicio.loteId, loteSession.loteId))
    .innerJoin(lote, eq(lote.id, loteSession.loteId))
    .innerJoin(
      dispositivoServicio,
      eq(dispositivoServicio.dispositivoId, loteSession.dispositivoId)
    )
    .where(
      and(
        eq(loteServicio.servicioId, servicioId),
        eq(dispositivoServicio.servicioId, servicioId),
        isNotNull(dispositivoServicio.fechaInicio),
        isNull(dispositivoServicio.fechaTermino),
        isNull(loteSession.endTime)
      )
    );

  return [...new Map(
    rows
      .filter((row) => row.dispositivoId !== excludedDeviceId)
      .map((row) => [row.id, { id: row.id, codigoLote: row.codigoLote }])
  ).values()];
}

export async function assignDeviceToServicio(input: {
  dispositivoId: string;
  servicioId: string;
  maquina?: string | null;
  loteId?: string | null;
  salidaOrden?: number | null;
  salidaNombre?: string | null;
}): Promise<AssignDeviceResult> {
  return db.transaction(async (tx) => {
    const [srv] = await tx
      .select({ estado: servicio.estado })
      .from(servicio)
      .where(eq(servicio.id, input.servicioId))
      .limit(1);
    if (!srv) throw new Error("SERVICE_NOT_FOUND");
    if (srv.estado === "completado" || srv.estado === "cancelado") {
      throw new Error("SERVICE_CLOSED");
    }

    const activeLotes =
      srv.estado === "en_curso"
        ? await findActiveLotes(tx, input.servicioId, input.dispositivoId)
        : [];

    let loteId: string | null = null;
    if (input.loteId) {
      loteId = activeLotes.some((candidate) => candidate.id === input.loteId)
        ? input.loteId
        : null;
      if (!loteId) throw new Error("INVALID_ACTIVE_LOTE");
    } else if (activeLotes.length === 1) {
      loteId = activeLotes[0].id;
    } else if (activeLotes.length > 1) {
      return { kind: "selection_required", activeLotes };
    }

    const now = new Date();

    // Reasignar cierra la fila vigente e inserta una nueva. Sin esto la salida
    // física del dispositivo se perdería en cada reasignación y el servicio
    // quedaría con un hueco en la numeración (o peor, con la salida libre para
    // que otro equipo la tome). Se hereda salvo que venga explícita en el input.
    const [previa] = await tx
      .select({
        salidaOrden: dispositivoServicio.salidaOrden,
        salidaNombre: dispositivoServicio.salidaNombre,
      })
      .from(dispositivoServicio)
      .where(
        and(
          eq(dispositivoServicio.dispositivoId, input.dispositivoId),
          eq(dispositivoServicio.servicioId, input.servicioId),
          isNull(dispositivoServicio.fechaTermino)
        )
      )
      .limit(1);

    const salidaOrden =
      input.salidaOrden !== undefined ? input.salidaOrden : previa?.salidaOrden ?? null;
    const salidaNombre =
      input.salidaNombre !== undefined
        ? input.salidaNombre?.trim() || null
        : previa?.salidaNombre ?? null;

    await tx
      .update(dispositivoServicio)
      .set({ fechaTermino: now })
      .where(
        and(
          eq(dispositivoServicio.dispositivoId, input.dispositivoId),
          isNull(dispositivoServicio.fechaTermino)
        )
      );

    const [assignment] = await tx
      .insert(dispositivoServicio)
      .values({
        dispositivoId: input.dispositivoId,
        servicioId: input.servicioId,
        maquina: input.maquina?.trim() || null,
        asignadoAt: now,
        fechaInicio: srv.estado === "en_curso" ? now : null,
        fechaTermino: null,
        salidaOrden,
        salidaNombre:
          salidaNombre ?? (salidaOrden !== null ? `Salida ${salidaOrden}` : null),
      })
      .returning();

    if (!loteId) {
      return { kind: "assigned", assignment, joinedActiveLote: false, loteSession: null };
    }

    const opened = await openLoteSessionExclusiveInTransaction(tx, {
      loteId,
      dispositivoId: input.dispositivoId,
      startTime: now,
    });
    if (opened.closedSessionIds.length > 0) {
      await tx
        .update(cajaLoteSession)
        .set({ retiradoAt: now })
        .where(
          and(
            inArray(cajaLoteSession.loteSessionId, opened.closedSessionIds),
            isNull(cajaLoteSession.retiradoAt)
          )
        );
    }

    return {
      kind: "assigned",
      assignment,
      joinedActiveLote: true,
      loteSession: opened.session,
    };
  });
}
