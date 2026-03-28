import { NextResponse } from "next/server";
import { db } from "@/db";
import { servicio } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const tipo = searchParams.get("tipo");

  const query = db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
    })
    .from(servicio)
    .where(eq(servicio.empresaId, empresaId));

  const servicios = await query;

  const filtered = tipo
    ? servicios.filter((s) => s.tipo === tipo)
    : servicios;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const { empresaId, nombre } = await request.json();
  if (!empresaId || !nombre) {
    return NextResponse.json(
      { error: "empresaId y nombre son requeridos" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(servicio)
    .values({ empresaId, nombre, tipo: "linea_conteo" })
    .returning({ id: servicio.id, nombre: servicio.nombre });

  return NextResponse.json(created, { status: 201 });
}
