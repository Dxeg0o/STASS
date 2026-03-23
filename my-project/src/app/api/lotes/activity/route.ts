// app/api/lotes/activity/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteSession, dispositivoServicio } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json();
  const { loteId, dispositivoId: bodyDispositivoId } = body;

  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  // Obtener servicioId del lote
  const loteDoc = await db.query.lote.findFirst({
    where: eq(lote.id, loteId),
  });
  if (!loteDoc) {
    return NextResponse.json({ error: "lote not found" }, { status: 404 });
  }

  const servicioId = loteDoc.servicioId;

  // Resolver dispositivoId: usar el del body o el primero del servicio
  let dispositivoId = bodyDispositivoId;
  if (!dispositivoId) {
    const ds = await db.query.dispositivoServicio.findFirst({
      where: eq(dispositivoServicio.servicioId, servicioId),
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

  // Cerrar cualquier sesión abierta del servicio
  await db
    .update(loteSession)
    .set({ endTime: now })
    .where(eq(loteSession.servicioId, servicioId) && isNull(loteSession.endTime));

  // Abrir nueva sesión
  const [session] = await db
    .insert(loteSession)
    .values({ loteId, dispositivoId, servicioId, startTime: now, endTime: null })
    .returning();

  return NextResponse.json(session, { status: 201 });
}
