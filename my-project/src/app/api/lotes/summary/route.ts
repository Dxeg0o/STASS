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
  const activities = await LoteActivity.find({ loteId });

  // 2) Si no hay sesiones, devuelvo arreglo vacío
  if (activities.length === 0) {
    return NextResponse.json([]);
  }

  const now = new Date();

  // 3) Construyo un array de condiciones SOLO por rango de timestamp
  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: { $gte: startTime, $lte: endTime ?? now },
  }));

  // 4) Agrupo resultados por dispositivo, especificando el tipo genérico <DeviceGroup>
  const matchStage: Record<string, unknown> = { $or: orConds };
  if (servicioId) matchStage.servicioId = servicioId;

  const groups = await Conteo.aggregate<DeviceGroup>([
    { $match: matchStage },
    {
      $group: {
        _id: "$dispositivo",
        countIn: {
          $sum: { $cond: [{ $eq: ["$direction", "in"] }, 1, 0] },
        },
        countOut: {
          $sum: { $cond: [{ $eq: ["$direction", "out"] }, 1, 0] },
        },
        lastTimestamp: { $max: "$timestamp" },
      },
    },
  ]);

  // 5) Para cada grupo, obtengo el servicioId del último documento (por timestamp) de ese dispositivo
  const summaryArray = await Promise.all(
    groups.map(async (grp: DeviceGroup) => {
      const dispositivo = grp._id;
      const countIn = grp.countIn;
      const countOut = grp.countOut;
      const lastTimestamp = grp.lastTimestamp;

      // Buscar el documento que corresponde a este dispositivo y timestamp
      const lastQuery: Record<string, unknown> = {
        dispositivo,
        timestamp: lastTimestamp,
      };
      if (servicioId) lastQuery.servicioId = servicioId;
      const lastEntry = await Conteo.findOne(lastQuery);

      return {
        dispositivo,
        countIn,
        countOut,
        lastTimestamp,
        servicioId: lastEntry?.servicioId || "",
      };
    })
  );

  // 6) Devuelvo un arreglo de objetos
  return NextResponse.json(summaryArray);
}
