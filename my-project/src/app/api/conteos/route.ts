// app/api/conteos/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Conteo } from "@/models/conteo";
import { LoteActivity } from "@/models/loteactivity";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  if (!loteId) {
    return NextResponse.json({ error: "loteId es requerido" }, { status: 400 });
  }

  await connectDb();

  // 1) Traer todas las sesiones de actividad de este lote
  const activities = await LoteActivity.find({
    loteId: new mongoose.Types.ObjectId(loteId),
  }).lean();

  // 2) Si no hay sesiones, devolvemos un arreglo vacío
  if (activities.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const now = new Date();

  // 3) Construir un array de condiciones OR por cada intervalo [startTime, endTime]
  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: { $gte: startTime, $lte: endTime ?? now },
  }));

  // 4) Buscar todos los conteos que estén en cualquiera de esos intervalos
  const conteos = await Conteo.find({ $or: orConds })
    .sort({ timestamp: 1 })
    .lean();

  // 5) Devolverlos directamente
  return NextResponse.json(conteos);
}
