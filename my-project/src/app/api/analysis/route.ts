import { NextResponse, NextRequest } from "next/server";

import { connectDb } from "@/lib/mongodb";
import Analisis from "@/models/analysis";
import mongoose from "mongoose";

export async function GET() {
  await connectDb();

  const analysis = await Analisis.find();

  return NextResponse.json(analysis);
}

// Método POST: Crea un nuevo análisis
export async function POST(request: NextRequest) {
  try {
    // Conectar a la base de datos
    await connectDb();

    // Obtener los datos del cuerpo de la solicitud
    const data = await request.json();

    // Validar los datos requeridos
    const { empresa_id, producto_id } = data;
    if (!empresa_id || !producto_id) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: empresa_id o producto_id" },
        { status: 400 }
      );
    }

    // Crear el análisis
    const analysis = await Analisis.create({
      _id: new mongoose.Types.ObjectId().toString(),
      empresa_id,
      fecha_creacion: new Date(),
      estado: "en_progreso",
      producto: producto_id,
    });

    // Responder con el análisis creado
    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("Error al crear análisis:", error);
    return NextResponse.json(
      { message: "Error al crear el análisis" },
      { status: 500 }
    );
  }
}
