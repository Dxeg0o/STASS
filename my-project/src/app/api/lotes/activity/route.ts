// app/api/lotes/activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  cajaLoteSession,
  loteServicio,
  dispositivoServicio,
  servicio,
} from "@/db/schema";
import { eq, isNotNull, isNull, and, desc, inArray } from "drizzle-orm";
import { verifyEmpresaAdminFromPayload, verifyToken } from "@/lib/auth";
import { openLoteSessionsExclusive } from "@/lib/app-session";

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

  const [srv] = await db
    .select({ empresaId: servicio.empresaId })
    .from(servicio)
    .where(eq(servicio.id, servicioId))
    .limit(1);

  if (!srv) {
    return NextResponse.json(
      { error: "Servicio not found" },
      { status: 404 }
    );
  }

  const admin = await verifyEmpresaAdminFromPayload(
    await verifyToken(request),
    srv.empresaId
  );

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const results = await openLoteSessionsExclusive(
    dispositivoIds.map((dispositivoId) => ({
      loteId,
      dispositivoId,
      startTime: now,
    }))
  );
  const sessions = results.map((result) => result.session);
  const closedSessionIds = results.flatMap((result) => result.closedSessionIds);

  // La apertura exclusiva ya cerró/recortó las lote_session. Retiramos sus
  // cajas después, usando los ids exactos que devolvió el helper común.
  if (closedSessionIds.length > 0) {
    await db
      .update(cajaLoteSession)
      .set({ retiradoAt: now })
      .where(
        and(
          inArray(cajaLoteSession.loteSessionId, closedSessionIds),
          isNull(cajaLoteSession.retiradoAt)
        )
      );
  }

  return NextResponse.json(
    { sessions, updatedDeviceCount: sessions.length },
    { status: 201 }
  );
}
