import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Lote } from "@/models/lotes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();
  const lotes = await Lote.find({ empresaId }).sort({ fechaCreacion: -1 });
  return NextResponse.json(lotes);
}

export async function POST(request: Request) {
  const { nombre, empresaId } = await request.json();
  if (!nombre || !empresaId) {
    return NextResponse.json(
      { error: "nombre and empresaId are required" },
      { status: 400 }
    );
  }

  await connectDb();
  const lote = await Lote.create({
    nombre,
    empresaId,
    fechaCreacion: new Date(),
  });

  return NextResponse.json(lote, { status: 201 });
}
