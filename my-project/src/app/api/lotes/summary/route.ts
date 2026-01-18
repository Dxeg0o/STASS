// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import { Conteo } from "@/models/conteo";

// 1) Definimos aquí la interfaz que describe cada resultado del $group:
interface DeviceGroup {
  _id: string; // equivale a "dispositivo"
  countIn: number; // cantidad de registros con direction 'in'
  countOut: number; // cantidad de registros con direction 'out'
  lastTimestamp: Date; // máximo timestamp encontrado
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  const servicioId = searchParams.get("servicioId");
  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  await connectDb();

  // 1) Todas las sesiones de actividad para este lote
  const activities = await LoteActivity.find({ loteId }).lean();

  // 2) Si no hay sesiones, devuelvo arreglo vacío
  if (activities.length === 0) {
    return NextResponse.json([]);
  }

  const now = new Date();

  // 3) Construyo un array de condiciones SOLO por rango de timestamp
  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: { $gte: startTime, $lte: endTime ?? now },
  }));

  // 4) Agrupo resultados por dispositivo
  const matchStage: Record<string, unknown> = { $or: orConds };
  if (servicioId) matchStage.servicioId = servicioId;

  // Optimized aggregation: Match -> Sort (Desc) -> Group (First)
  // This avoids N+1 queries by grabbing the 'latest' fields during grouping
  const summaryArray = await Conteo.aggregate([
    { $match: matchStage },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$dispositivo",
        countIn: {
          $sum: { $cond: [{ $eq: ["$direction", "in"] }, 1, 0] },
        },
        countOut: {
          $sum: { $cond: [{ $eq: ["$direction", "out"] }, 1, 0] },
        },
        lastTimestamp: { $first: "$timestamp" },
        servicioId: { $first: "$servicioId" },
      },
    },
    {
      $project: {
        _id: 0,
        dispositivo: "$_id", // Map _id back to dispositivo
        countIn: 1,
        countOut: 1,
        lastTimestamp: 1,
        servicioId: 1,
      },
    },
  ]).allowDiskUse(true);

  return NextResponse.json(summaryArray);
}
