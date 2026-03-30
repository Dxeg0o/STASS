import { NextResponse } from "next/server";
import { db } from "@/db";
import { proceso } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  const { procesoId } = await params;

  const result = await db.query.proceso.findFirst({
    where: eq(proceso.id, procesoId),
    with: {
      tipoProceso: true,
      producto: true,
      servicios: {
        with: {
          loteServicios: {
            with: { lote: true },
          },
        },
      },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  const { procesoId } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.estado !== undefined) updateData.estado = body.estado;
  if (body.fechaInicio !== undefined) updateData.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  if (body.fechaFin !== undefined) updateData.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
  if (body.notas !== undefined) updateData.notas = body.notas;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(proceso)
    .set(updateData)
    .where(eq(proceso.id, procesoId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
