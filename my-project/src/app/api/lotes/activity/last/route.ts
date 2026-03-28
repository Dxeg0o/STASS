// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteSession, loteServicio, servicio } from "@/db/schema";
import { eq, desc, inArray, isNull, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  const empresaId = searchParams.get("empresaId");

  if (!servicioId && !empresaId) {
    return NextResponse.json(
      { error: "servicioId or empresaId is required" },
      { status: 400 }
    );
  }

  // Get servicioIds
  let servicioIds: string[] = [];
  if (servicioId) {
    servicioIds = [servicioId];
  } else {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));
    servicioIds = servicios.map((s) => s.id);
  }

  if (servicioIds.length === 0) return NextResponse.json(null);

  // Get loteIds via loteServicio
  const lotes = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(inArray(loteServicio.servicioId, servicioIds));
  const loteIds = [...new Set(lotes.map((l) => l.loteId))];

  if (loteIds.length === 0) return NextResponse.json(null);

  // Find most recent open session
  const [session] = await db
    .select({
      loteId: loteSession.loteId,
      startTime: loteSession.startTime,
    })
    .from(loteSession)
    .where(and(isNull(loteSession.endTime), inArray(loteSession.loteId, loteIds)))
    .orderBy(desc(loteSession.startTime))
    .limit(1);

  if (!session) return NextResponse.json(null, { status: 200 });

  const [loteData] = await db
    .select({ id: lote.id, createdAt: lote.createdAt })
    .from(lote)
    .where(eq(lote.id, session.loteId));

  return NextResponse.json(
    {
      id: loteData.id,
      fechaCreacion: loteData.createdAt,
    },
    { status: 200 }
  );
}
