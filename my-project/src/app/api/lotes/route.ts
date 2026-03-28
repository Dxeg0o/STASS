import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, servicio, variedad, producto } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

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

  let condition;

  if (servicioId) {
    condition = eq(lote.servicioId, servicioId);
  } else {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));

    const servicioIds = servicios.map((s) => s.id);
    if (servicioIds.length === 0) return NextResponse.json([]);

    condition = inArray(lote.servicioId, servicioIds);
  }

  const lotes = await db
    .select({
      id: lote.id,
      nombre: lote.nombre,
      fechaCreacion: lote.createdAt,
      servicioId: lote.servicioId,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(condition)
    .orderBy(desc(lote.createdAt));

  return NextResponse.json(lotes);
}

export async function POST(request: Request) {
  const { nombre, servicioId, variedadId } = await request.json();
  if (!nombre || !servicioId) {
    return NextResponse.json(
      { error: "nombre and servicioId are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(lote)
    .values({
      nombre,
      servicioId,
      variedadId: variedadId || null,
      createdAt: new Date(),
    })
    .returning();

  return NextResponse.json(
    { id: created.id, nombre: created.nombre, fechaCreacion: created.createdAt },
    { status: 201 }
  );
}
