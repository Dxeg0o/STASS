import { NextResponse } from "next/server";
import { db } from "@/db";
import { caja } from "@/db/schema";
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

  const cajas = await db
    .select()
    .from(caja)
    .where(eq(caja.empresaId, empresaId));

  return NextResponse.json(cajas);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { empresaId, codigo, tipo, capacidad } = body;

  if (!empresaId || !codigo) {
    return NextResponse.json(
      { error: "empresaId y codigo son requeridos" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(caja)
    .values({
      empresaId,
      codigo,
      tipo: tipo || "reutilizable",
      capacidad: capacidad || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
