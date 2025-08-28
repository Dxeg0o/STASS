import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Lote } from "@/models/lotes";
import { Servicio } from "@/models/servicio";

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

  await connectDb();

  let query: Record<string, unknown> = {};
  if (servicioId) {
    query = { servicioId };
  } else if (empresaId) {
    const servicios = await Servicio.find({ empresaId }, { _id: 1 });
    const servicioIds = servicios.map((s) => s._id);
    query = { servicioId: { $in: servicioIds } };
  }

  const docs = await Lote.find(query).sort({ fechaCreacion: -1 });
  const lotes = docs.map((lote) => ({
    id: lote.id.toString(),
    nombre: lote.nombre,
    fechaCreacion: lote.fechaCreacion,
  }));
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

  await connectDb();
  const lote = await Lote.create({
    nombre,
    servicioId,
    fechaCreacion: new Date(),
  });

  return NextResponse.json(lote, { status: 201 });
}
