// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteSession, servicio } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

  // Buscar la última sesión abierta (sin endTime) de esos servicios
  const session = await db.query.loteSession.findFirst({
    where: (ls, { and, isNull, inArray }) =>
      and(isNull(ls.endTime), inArray(ls.servicioId, servicioIds)),
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
