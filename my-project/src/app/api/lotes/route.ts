import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteServicio, servicio, variedad, producto } from "@/db/schema";
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

  let servicioIds: string[];

  if (servicioId) {
    servicioIds = [servicioId];
  } else {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));
    servicioIds = servicios.map((s) => s.id);
    if (servicioIds.length === 0) return NextResponse.json([]);
  }

  // Get lotes via loteServicio junction
  const loteIds = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(inArray(loteServicio.servicioId, servicioIds));

  const uniqueLoteIds = [...new Set(loteIds.map((l) => l.loteId))];
  if (uniqueLoteIds.length === 0) return NextResponse.json([]);

  const lotes = await db
    .select({
      id: lote.id,
      codigoLote: lote.codigoLote,
      fechaCreacion: lote.createdAt,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      variedadTipo: variedad.tipo,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(inArray(lote.id, uniqueLoteIds))
    .orderBy(desc(lote.createdAt));

  return NextResponse.json(lotes);
}

export async function POST(request: Request) {
  const { servicioId, variedadId, codigoLote } = await request.json();
  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId is required" },
      { status: 400 }
    );
  }

  // Create lote
  const [created] = await db
    .insert(lote)
    .values({
      codigoLote: codigoLote?.trim() || null,
      variedadId: variedadId || null,
      createdAt: new Date(),
    })
    .returning();

  // Create lote_servicio junction
  await db.insert(loteServicio).values({
    loteId: created.id,
    servicioId,
  });

  return NextResponse.json(
    { id: created.id, codigoLote: created.codigoLote, fechaCreacion: created.createdAt },
    { status: 201 }
  );
}
