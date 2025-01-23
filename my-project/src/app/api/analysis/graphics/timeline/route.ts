import { NextResponse, NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb";
import Prediccion from "@/models/predictions";

export async function GET(request: NextRequest) {
  await connectDb();

  const id_analisis = request.nextUrl.searchParams.get("id_analisis");

  if (!id_analisis) {
    return NextResponse.json(
      { error: "Se requiere id_analisis" },
      { status: 400 }
    );
  }

  try {
    const predicciones = await Prediccion.find({ analisis_id: id_analisis });

    if (predicciones.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron predicciones" },
        { status: 404 }
      );
    }

    const total = predicciones.length;
    const aptos = predicciones.filter((p) => p.resultado === "apto").length;
    const porcentajeAptos = ((aptos / total) * 100).toFixed(2);

    // Devolver un array para el frontend
    const responseData = [
      {
        timestamp: new Date().toISOString(),
        percentage: parseFloat(porcentajeAptos),
      },
    ];

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error al obtener predicciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
