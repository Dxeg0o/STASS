import { NextResponse } from "next/server";
import { verifyAppKey } from "@/lib/app-auth";
import {
  getCajaCountForLoteGlobal,
  getCajaCountForLoteServicio,
} from "@/lib/app-session";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loteSession } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tablet = await verifyAppKey(request);
  if (!tablet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: loteId } = await params;
  const sessions = await db
    .select({ id: loteSession.id, servicioId: loteSession.servicioId })
    .from(loteSession)
    .where(and(eq(loteSession.loteId, loteId), isNull(loteSession.endTime)));
  const serviceIds = [...new Set(sessions.map((session) => session.servicioId))];
  const servicioId = serviceIds.length === 1 ? serviceIds[0] : null;
  if (!servicioId) {
    console.warn("caja_order_service_fallback", {
      loteId,
      tabletId: tablet.id,
      sessionIds: sessions.map((session) => session.id),
      serviceIds,
    });
  }
  const count = servicioId
    ? await getCajaCountForLoteServicio(loteId, servicioId)
    : await getCajaCountForLoteGlobal(loteId);

  return NextResponse.json({ count }, { status: 200 });
}
