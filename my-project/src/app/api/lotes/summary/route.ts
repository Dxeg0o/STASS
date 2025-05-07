import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import mongoose from "mongoose";
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

  // 2) Si no hay sesiones, devuelvo resumen vacío
  if (activities.length === 0) {
    return NextResponse.json({
      countIn: 0,
      countOut: 0,
      lastTimestamp: null,
      dispositivo: "",
      servicioId: "",
    });
  }

  const now = new Date();
  // 3) Construyo un array de condiciones SOLO por rango de timestamp
  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: { $gte: startTime, $lte: endTime ?? now },
  }));

  // 4) Agrego todos los conteos en esos intervalos
  const [agg] = await Conteo.aggregate([
    { $match: { $or: orConds } },
    {
      $group: {
        _id: null,
        countIn: { $sum: "$count_in" }, // <- aquí
        countOut: { $sum: "$count_out" }, // <- y aquí
        lastTimestamp: { $max: "$timestamp" },
      },
    },
  ]);

  const { countIn = 0, countOut = 0, lastTimestamp } = agg || {};

  // 5) Busco el último documento para extraer dispositivo y servicioId
  const lastEntry = lastTimestamp
    ? await Conteo.findOne({ timestamp: lastTimestamp })
    : null;

  return NextResponse.json({
    countIn,
    countOut,
    lastTimestamp,
    dispositivo: lastEntry?.dispositivo || "",
    servicioId: lastEntry?.servicioId || "",
  });
}
