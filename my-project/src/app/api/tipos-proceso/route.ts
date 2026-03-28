import { NextResponse } from "next/server";
import { db } from "@/db";
import { tipoProceso } from "@/db/schema";
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

  const tipos = await db
    .select()
    .from(tipoProceso)
    .where(eq(tipoProceso.empresaId, empresaId));

  return NextResponse.json(tipos);
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
    .insert(tipoProceso)
    .values({ empresaId, nombre })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
