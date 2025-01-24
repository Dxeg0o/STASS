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
    const { empresaId, productoId } = data;
    if (!empresaId || !productoId) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: empresaId o productoId" },
        { status: 400 }
      );
    }

    // Crear el análisis
    const analysis = await Analisis.create({
      _id: new mongoose.Types.ObjectId().toString(),
      empresaId,
      fechaCreacion: new Date(),
      estado: "en_progreso",
      producto: productoId,
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
