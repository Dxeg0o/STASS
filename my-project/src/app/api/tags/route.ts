import { NextResponse, NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb";
import Etiqueta from "@/models/tags";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await connectDb();

  // Extraemos el parámetro empresaId de la URL
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  let tags;
  if (empresaId) {
    // Si se proporciona empresaId, filtramos las etiquetas
    tags = await Etiqueta.find({ empresaId });
  } else {
    // Si no se proporciona, obtenemos todas las etiquetas
    tags = await Etiqueta.find();
  }

  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  // Si no se envía _id, lo generamos automáticamente.
  if (!data._id) {
    data._id = new mongoose.Types.ObjectId().toString();
  }

  try {
    const tag = await Etiqueta.create(data);
    return NextResponse.json(tag);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al crear la etiqueta" },
      { status: 500 }
    );
  }
}
