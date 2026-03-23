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

  const servicios = await db
    .select({ id: servicio.id, nombre: servicio.nombre })
    .from(servicio)
    .where(eq(servicio.empresaId, empresaId));

  return NextResponse.json(servicios);
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
