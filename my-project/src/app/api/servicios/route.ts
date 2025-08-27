import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Servicio } from "@/models/servicio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }
  await connectDb();
  const servicios = await Servicio.find({ empresaId })
    .select("_id nombre")
    .lean<{ _id: unknown; nombre: string }[]>();
  return NextResponse.json(
    servicios.map((s) => ({ id: String(s._id), nombre: s.nombre }))
  );
}

export async function POST(request: Request) {
  const { empresaId, nombre } = await request.json();
  if (!empresaId || !nombre) {
    return NextResponse.json(
      { error: "empresaId y nombre son requeridos" },
      { status: 400 }
    );
  }
  await connectDb();
  const servicio = await Servicio.create({ empresaId, nombre });
  return NextResponse.json(
    { id: servicio._id.toString(), nombre: servicio.nombre },
    { status: 201 }
  );
}
