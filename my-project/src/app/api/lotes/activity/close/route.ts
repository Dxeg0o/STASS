// app/api/lotes/activity/close/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  cajaLoteSession,
  dispositivoServicio,
  loteSession,
  servicio,
} from "@/db/schema";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { verifyEmpresaAdminFromPayload, verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const servicioId =
    typeof body.servicioId === "string" ? body.servicioId.trim() : "";

  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId is required" },
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

  const now = new Date();
  const deviceAssignments = await db
    .select({ dispositivoId: dispositivoServicio.dispositivoId })
    .from(dispositivoServicio)
    .where(
      and(
        eq(dispositivoServicio.servicioId, servicioId),
        isNotNull(dispositivoServicio.fechaInicio),
        isNull(dispositivoServicio.fechaTermino)
      )
    );

  const dispositivoIds = deviceAssignments.map(
    (assignment) => assignment.dispositivoId
  );

  if (dispositivoIds.length === 0) {
    return NextResponse.json(
      { error: "No active devices found for this service" },
      { status: 400 }
    );
  }

  const closedSessionCount = await db.transaction(async (tx) => {
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

    if (openSessionIds.length === 0) {
      return 0;
    }

    await tx
      .update(cajaLoteSession)
      .set({ retiradoAt: now })
      .where(
        and(
          inArray(cajaLoteSession.loteSessionId, openSessionIds),
          isNull(cajaLoteSession.retiradoAt)
        )
      );

    await tx
      .update(loteSession)
      .set({ endTime: now })
      .where(inArray(loteSession.id, openSessionIds));

    return openSessionIds.length;
  });

  return NextResponse.json(
    { success: true, closedSessionCount },
    { status: 200 }
  );
}
