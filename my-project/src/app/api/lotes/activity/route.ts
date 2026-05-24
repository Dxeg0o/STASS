// app/api/lotes/activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  cajaLoteSession,
  loteSession,
  loteServicio,
  dispositivoServicio,
} from "@/db/schema";
import { eq, isNotNull, isNull, and, desc, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    loteId,
    servicioId: bodyServicioId,
    dispositivoId: bodyDispositivoId,
  } = body;

  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  let servicioId = bodyServicioId as string | undefined;

  if (servicioId) {
    const [loteAssignment] = await db
      .select({ servicioId: loteServicio.servicioId })
      .from(loteServicio)
      .where(
        and(
          eq(loteServicio.loteId, loteId),
          eq(loteServicio.servicioId, servicioId)
        )
      )
      .limit(1);

    if (!loteAssignment) {
      return NextResponse.json(
        { error: "Lote is not assigned to this service" },
        { status: 400 }
      );
    }
  } else if (bodyDispositivoId) {
    // Compatibilidad con clientes antiguos que cambiaban un dispositivo puntual.
    const [latestAssignment] = await db
      .select({ servicioId: loteServicio.servicioId })
      .from(loteServicio)
      .where(eq(loteServicio.loteId, loteId))
      .orderBy(desc(loteServicio.asignadoAt))
      .limit(1);

    if (!latestAssignment) {
      return NextResponse.json(
        { error: "lote has no servicio assigned" },
        { status: 404 }
      );
    }

    servicioId = latestAssignment.servicioId;
  } else {
    return NextResponse.json(
      { error: "servicioId is required when dispositivoId is not provided" },
      { status: 400 }
    );
  }

  const deviceAssignments = bodyDispositivoId
    ? await db
        .select({ dispositivoId: dispositivoServicio.dispositivoId })
        .from(dispositivoServicio)
        .where(
          and(
            eq(dispositivoServicio.servicioId, servicioId),
            eq(dispositivoServicio.dispositivoId, bodyDispositivoId),
            isNotNull(dispositivoServicio.fechaInicio),
            isNull(dispositivoServicio.fechaTermino)
          )
        )
        .limit(1)
    : await db
        .select({ dispositivoId: dispositivoServicio.dispositivoId })
        .from(dispositivoServicio)
        .where(
          and(
            eq(dispositivoServicio.servicioId, servicioId),
            isNotNull(dispositivoServicio.fechaInicio),
            isNull(dispositivoServicio.fechaTermino)
          )
        );

  if (bodyDispositivoId && deviceAssignments.length === 0) {
    return NextResponse.json(
      { error: "Device is not assigned to this service" },
      { status: 400 }
    );
  }

  const dispositivoIds = deviceAssignments.map(
    (assignment) => assignment.dispositivoId
  );

  if (dispositivoIds.length === 0) {
    return NextResponse.json(
      { error: "No active devices found for this service" },
      { status: 400 }
    );
  }

  const now = new Date();

  const sessions = await db.transaction(async (tx) => {
    const openSessions = await tx
      .select({ id: loteSession.id })
      .from(loteSession)
      .where(
        and(
          inArray(loteSession.dispositivoId, dispositivoIds),
          isNull(loteSession.endTime)
        )
      );
    const openSessionIds = openSessions.map((session) => session.id);

    if (openSessionIds.length > 0) {
      await tx
        .update(cajaLoteSession)
        .set({ retiradoAt: now })
        .where(
          and(
            inArray(cajaLoteSession.loteSessionId, openSessionIds),
            isNull(cajaLoteSession.retiradoAt)
          )
        );
    }

    await tx
      .update(loteSession)
      .set({ endTime: now })
      .where(
        and(
          inArray(loteSession.dispositivoId, dispositivoIds),
          isNull(loteSession.endTime)
        )
      );

    return tx
      .insert(loteSession)
      .values(
        dispositivoIds.map((dispositivoId) => ({
          loteId,
          dispositivoId,
          startTime: now,
          endTime: null,
        }))
      )
      .returning();
  });

  return NextResponse.json(
    { sessions, updatedDeviceCount: sessions.length },
    { status: 201 }
  );
}
