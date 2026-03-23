import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, servicio } from "@/db/schema";
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

  let lotes;

  if (servicioId) {
    lotes = await db
      .select({ id: lote.id, nombre: lote.nombre, fechaCreacion: lote.createdAt })
      .from(lote)
      .where(eq(lote.servicioId, servicioId))
      .orderBy(desc(lote.createdAt));
  } else {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));

    const servicioIds = servicios.map((s) => s.id);
    if (servicioIds.length === 0) return NextResponse.json([]);

    lotes = await db
      .select({ id: lote.id, nombre: lote.nombre, fechaCreacion: lote.createdAt })
      .from(lote)
      .where(inArray(lote.servicioId, servicioIds))
      .orderBy(desc(lote.createdAt));
  }

  return NextResponse.json(lotes);
}

export async function POST(request: Request) {
  const { nombre, servicioId } = await request.json();
  if (!nombre || !servicioId) {
    return NextResponse.json(
      { error: "nombre and servicioId are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(lote)
    .values({ nombre, servicioId, createdAt: new Date() })
    .returning();

  return NextResponse.json(
    { id: created.id, nombre: created.nombre, fechaCreacion: created.createdAt },
    { status: 201 }
  );
}
