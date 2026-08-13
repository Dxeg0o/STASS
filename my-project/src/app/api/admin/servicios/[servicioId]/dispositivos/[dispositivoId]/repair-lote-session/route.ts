import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cajaLoteSession, dispositivoServicio, loteServicio } from "@/db/schema";
import { verifyAdmin } from "@/lib/auth";
import { openLoteSessionExclusiveInTransaction } from "@/lib/app-session";

interface RouteContext {
  params: Promise<{ servicioId: string; dispositivoId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { servicioId, dispositivoId } = await context.params;
  const body = await req.json().catch(() => null);
  const loteId = typeof body?.loteId === "string" ? body.loteId : null;
  const effectiveAt = typeof body?.effectiveAt === "string" ? new Date(body.effectiveAt) : null;
  if (!loteId || !effectiveAt || Number.isNaN(effectiveAt.getTime())) {
    return NextResponse.json({ error: "loteId y effectiveAt válidos son requeridos" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [assignment] = await tx
      .select({ fechaInicio: dispositivoServicio.fechaInicio })
      .from(dispositivoServicio)
      .where(
        and(
          eq(dispositivoServicio.dispositivoId, dispositivoId),
          eq(dispositivoServicio.servicioId, servicioId),
          isNotNull(dispositivoServicio.fechaInicio),
          isNull(dispositivoServicio.fechaTermino)
        )
      )
      .limit(1);
    if (!assignment) throw new Error("ACTIVE_ASSIGNMENT_NOT_FOUND");
    if (effectiveAt < assignment.fechaInicio!) throw new Error("BEFORE_ASSIGNMENT");

    const [linked] = await tx
      .select({ loteId: loteServicio.loteId })
      .from(loteServicio)
      .where(and(eq(loteServicio.loteId, loteId), eq(loteServicio.servicioId, servicioId)))
      .limit(1);
    if (!linked) throw new Error("LOTE_NOT_ASSIGNED_TO_SERVICE");

    const opened = await openLoteSessionExclusiveInTransaction(tx, {
      loteId,
      dispositivoId,
      servicioId,
      startTime: effectiveAt,
    });
    if (opened.closedSessionIds.length > 0) {
      await tx
        .update(cajaLoteSession)
        .set({ retiradoAt: effectiveAt })
        .where(
          and(
            inArray(cajaLoteSession.loteSessionId, opened.closedSessionIds),
            isNull(cajaLoteSession.retiradoAt)
          )
        );
    }
    return opened.session;
  }).catch((error: unknown) => error);

  if (result instanceof Error) {
    const status = result.message === "LOTE_NOT_ASSIGNED_TO_SERVICE" ? 409 : 400;
    return NextResponse.json({ error: result.message }, { status });
  }
  const repairedSession = result as { startTime: Date; endTime: Date | null };
  return NextResponse.json({
    repaired: true,
    loteSession: repairedSession,
    effectiveAt: effectiveAt.toISOString(),
    correctedRange: { startTime: repairedSession.startTime, endTime: repairedSession.endTime },
    message: "Sesión corregida; el dispositivo puede reintentar su cola pendiente.",
  });
}
