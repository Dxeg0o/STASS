// app/api/conteos/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Conteo } from "@/models/conteo";
import { LoteActivity } from "@/models/loteactivity";
import { Lote } from "@/models/lotes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  const empresaId = searchParams.get("empresaId");

  if (!loteId && !empresaId) {
    return NextResponse.json(
      { error: "loteId o empresaId son requeridos" },
      { status: 400 }
    );
  }

  await connectDb();

  let activities;
  if (loteId) {
    // Obtener sesiones asociadas a un lote específico
    activities = await LoteActivity.find({
      loteId: new mongoose.Types.ObjectId(loteId),
    }).lean();
  } else if (empresaId) {
    // Buscar todos los lotes de la empresa
    const loteDocs = await Lote.find({ empresaId }, { _id: 1 });
    const loteIds = loteDocs.map((l) => l._id);
    if (loteIds.length === 0) {
      return NextResponse.json([]);
    }
    // Sesiones de todos esos lotes
    activities = await LoteActivity.find({ loteId: { $in: loteIds } }).lean();
  }

  if (!activities || activities.length === 0) {
    return NextResponse.json([]);
  }

  const now = new Date();
  const orConds = activities.map(({ startTime, endTime }) => ({
    timestamp: { $gte: startTime, $lte: endTime ?? now },
  }));

  const conteos = await Conteo.find({ $or: orConds })
    .sort({ timestamp: 1 })
    .select("timestamp direction dispositivo id perimeter servicioId")
    .lean();

  return NextResponse.json(conteos);
}
