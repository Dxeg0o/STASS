// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import { Conteo } from "@/models/conteo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
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

  // 4) Agrupo resultados por dispositivo
  const groups = await Conteo.aggregate([
    { $match: { $or: orConds } },
    {
      $group: {
        _id: "$dispositivo",
        countIn: { $sum: "$count_in" },
        countOut: { $sum: "$count_out" },
        lastTimestamp: { $max: "$timestamp" },
      },
    },
  ]);

  // 5) Para cada grupo, obtengo el servicioId del último documento (por timestamp) de ese dispositivo
  const summaryArray = await Promise.all(
    groups.map(async (grp: any) => {
      const dispositivo = grp._id as string;
      const countIn = grp.countIn as number;
      const countOut = grp.countOut as number;
      const lastTimestamp = grp.lastTimestamp as Date;

      // Buscar el documento que corresponde a este dispositivo y timestamp
      const lastEntry = await Conteo.findOne({
        dispositivo,
        timestamp: lastTimestamp,
      });

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
