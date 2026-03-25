// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteSession, servicio } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

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

  // Obtener ids de servicios relevantes
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

  // Obtener loteIds que pertenecen a esos servicios
  const lotes = await db
    .select({ id: lote.id })
    .from(lote)
    .where(inArray(lote.servicioId, servicioIds));
  const loteIds = lotes.map((l) => l.id);

  if (loteIds.length === 0) return NextResponse.json(null);

  // Buscar la última sesión abierta (sin endTime) de esos lotes
  const session = await db.query.loteSession.findFirst({
    where: (ls, { and, isNull, inArray }) =>
      and(isNull(ls.endTime), inArray(ls.loteId, loteIds)),
    orderBy: [desc(loteSession.startTime)],
    with: { lote: true },
  });

  if (!session) return NextResponse.json(null, { status: 200 });

  return NextResponse.json(
    {
      id: session.lote.id,
      nombre: session.lote.nombre,
      fechaCreacion: session.lote.createdAt,
    },
    { status: 200 }
  );
}
