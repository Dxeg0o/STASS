import { NextResponse } from "next/server";
import { db } from "@/db";
import { proceso } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const temporada = searchParams.get("temporada");
  const estado = searchParams.get("estado");
  const productoId = searchParams.get("productoId");
  const tipoProcesoId = searchParams.get("tipoProcesoId");

  const conditions = [eq(proceso.empresaId, empresaId)];
  if (temporada) conditions.push(eq(proceso.temporada, temporada));
  if (estado) conditions.push(eq(proceso.estado, estado));
  if (productoId) conditions.push(eq(proceso.productoId, productoId));
  if (tipoProcesoId) conditions.push(eq(proceso.tipoProcesoId, tipoProcesoId));

  const procesos = await db.query.proceso.findMany({
    where: and(...conditions),
    with: {
      tipoProceso: true,
      producto: true,
    },
  });

  return NextResponse.json(procesos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { empresaId, tipoProcesoId, productoId, temporada, estado, fechaInicio, fechaFin, notas } = body;

  if (!empresaId || !tipoProcesoId) {
    return NextResponse.json(
      { error: "empresaId y tipoProcesoId son requeridos" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(proceso)
    .values({
      empresaId,
      tipoProcesoId,
      productoId: productoId || null,
      temporada: temporada || null,
      estado: estado || "planificado",
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      notas: notas || null,
    })
    .returning();

  const result = await db.query.proceso.findFirst({
    where: eq(proceso.id, created.id),
    with: { tipoProceso: true, producto: true },
  });

  return NextResponse.json(result, { status: 201 });
}
