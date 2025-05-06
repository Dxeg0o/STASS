// app/api/lotes/summary/route.ts
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
  const oid = new mongoose.Types.ObjectId(loteId);

  // 1) Obtengo todas las sesiones de actividad para este lote
  const activities = await LoteActivity.find({ loteId: oid });
  const now = new Date();

  // 2) Construyo condiciones $or para cada rango [startTime, endTime|null→now]
  const orConds = activities.map(({ startTime, endTime }) => ({
    loteId: oid,
    timestamp: {
      $gte: startTime,
      $lte: endTime ?? now,
    },
  }));

  // Si no hay actividades, devuelvo un resumen vacío
  if (orConds.length === 0) {
    return NextResponse.json(
      {
        countIn: 0,
        countOut: 0,
        lastTimestamp: null,
        dispositivo: "",
        servicioId: "",
      },
      { status: 200 }
    );
  }

  // 3) Agrego los conteos dentro de esos rangos
  const agg = await Conteo.aggregate([
    { $match: { $or: orConds } },
    {
      $group: {
        _id: null,
        countIn: { $sum: "$countIn" },
        countOut: { $sum: "$countOut" },
        lastTimestamp: { $max: "$timestamp" },
      },
    },
  ]);

  const { countIn = 0, countOut = 0, lastTimestamp } = agg[0] || {};

  // 4) Busco el último registro para extraer dispositivo y servicioId
  const lastEntry = await Conteo.findOne({
    loteId: oid,
    timestamp: lastTimestamp,
  });

  return NextResponse.json(
    {
      countIn,
      countOut,
      lastTimestamp,
      dispositivo: lastEntry?.dispositivo || "",
      servicioId: lastEntry?.servicioId || "",
    },
    { status: 200 }
  );
}
