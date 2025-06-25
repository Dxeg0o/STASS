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
        const aggregation = await Prediccion.aggregate([
      { $match: { analisisId: id_analisis } },
      { $group: { _id: "$resultado", count: { $sum: 1 } } },
    ]);

    if (!aggregation || aggregation.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron predicciones" },
        { status: 404 }
      );
    }

    const total = aggregation.reduce((acc, r) => acc + r.count, 0);
    const aptos = aggregation.find((r) => r._id === "apto")?.count ?? 0;
    const porcentajeAptos = total > 0 ? (aptos / total) * 100 : 0;

    // Devolver un array para el frontend
    const responseData = [
      {
        timestamp: new Date().toISOString(),
        percentage: parseFloat(porcentajeAptos.toFixed(2)),
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
