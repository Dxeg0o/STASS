import { NextResponse } from "next/server";
import { db } from "@/db";
import { servicio, proceso, tipoProceso } from "@/db/schema";
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

  const tipo = searchParams.get("tipo");
  const procesoId = searchParams.get("procesoId");

  const conditions = [eq(servicio.empresaId, empresaId)];
  if (tipo) conditions.push(eq(servicio.tipo, tipo));
  if (procesoId) conditions.push(eq(servicio.procesoId, procesoId));

  const servicios = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
      estado: servicio.estado,
      procesoId: servicio.procesoId,
      usaCajas: servicio.usaCajas,
      tipoProcesoNombre: tipoProceso.nombre,
      procesoTemporada: proceso.temporada,
    })
    .from(servicio)
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(and(...conditions));

  return NextResponse.json(servicios);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { empresaId, nombre, tipo, ubicacionId, procesoId, usaCajas } = body;
  if (!empresaId || !nombre) {
    return NextResponse.json(
      { error: "empresaId y nombre son requeridos" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(servicio)
    .values({
      empresaId,
      nombre,
      tipo: tipo || "linea_conteo",
      ubicacionId: ubicacionId || null,
      procesoId: procesoId || null,
      usaCajas: usaCajas ?? false,
      estado: "planificado",
      fechaInicio: null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
