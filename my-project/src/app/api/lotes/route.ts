import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Lote } from "@/models/lotes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const servicioId = searchParams.get("servicioId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();
  const filter: Record<string, unknown> = { empresaId };
  if (servicioId) filter.servicioId = servicioId;
  const docs = await Lote.find(filter).sort({ fechaCreacion: -1 });
  const lotes = docs.map((lote) => ({
    id: lote.id.toString(),
    nombre: lote.nombre,
    fechaCreacion: lote.fechaCreacion,
    servicioId: lote.servicioId,
  }));
  return NextResponse.json(lotes);
}

export async function POST(request: Request) {
  const { nombre, empresaId, servicioId } = await request.json();
  if (!nombre || !empresaId || !servicioId) {
    return NextResponse.json(
      { error: "nombre, empresaId and servicioId are required" },
      { status: 400 }
    );
  }

  await connectDb();
  const lote = await Lote.create({
    nombre,
    empresaId,
    servicioId,
    fechaCreacion: new Date(),
  });

  return NextResponse.json(
    {
      id: lote._id.toString(),
      nombre: lote.nombre,
      fechaCreacion: lote.fechaCreacion,
      servicioId: lote.servicioId,
    },
    { status: 201 }
  );
}
