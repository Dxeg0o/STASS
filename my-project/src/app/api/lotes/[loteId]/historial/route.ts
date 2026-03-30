import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteServicio, servicio, proceso, tipoProceso } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const { loteId } = await params;

  const historial = await db
    .select({
      servicioId: loteServicio.servicioId,
      asignadoAt: loteServicio.asignadoAt,
      servicioNombre: servicio.nombre,
      servicioTipo: servicio.tipo,
      procesoId: proceso.id,
      procesoTemporada: proceso.temporada,
      procesoEstado: proceso.estado,
      tipoProcesoNombre: tipoProceso.nombre,
    })
    .from(loteServicio)
    .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(loteServicio.loteId, loteId))
    .orderBy(loteServicio.asignadoAt);

  return NextResponse.json(historial);
}
