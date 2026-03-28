// app/api/lotes/activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteSession, loteServicio, dispositivoServicio } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json();
  const { loteId, dispositivoId: bodyDispositivoId } = body;

  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  // Get servicio activo via loteServicio (most recent assignment)
  const [latestAssignment] = await db
    .select({ servicioId: loteServicio.servicioId })
    .from(loteServicio)
    .where(eq(loteServicio.loteId, loteId))
    .orderBy(desc(loteServicio.asignadoAt))
    .limit(1);

  if (!latestAssignment) {
    return NextResponse.json({ error: "lote has no servicio assigned" }, { status: 404 });
  }

  // Resolver dispositivoId
  let dispositivoId = bodyDispositivoId;
  if (!dispositivoId) {
    const ds = await db.query.dispositivoServicio.findFirst({
      where: eq(dispositivoServicio.servicioId, latestAssignment.servicioId),
    });
    dispositivoId = ds?.dispositivoId;
  }
  if (!dispositivoId) {
    return NextResponse.json(
      { error: "No device found for this service" },
      { status: 400 }
    );
  }

  const now = new Date();

  // Cerrar sesiones abiertas del dispositivo
  await db
    .update(loteSession)
    .set({ endTime: now })
    .where(and(eq(loteSession.dispositivoId, dispositivoId), isNull(loteSession.endTime)));

  // Abrir nueva sesion
  const [session] = await db
    .insert(loteSession)
    .values({ loteId, dispositivoId, startTime: now, endTime: null })
    .returning();

  return NextResponse.json(session, { status: 201 });
}
