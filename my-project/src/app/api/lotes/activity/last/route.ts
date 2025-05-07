// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import mongoose from "mongoose";
import { Lote } from "@/models/lotes"; // asegúrate de tener exportado tu modelo de Lote

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();

  // 1) Averiguo los IDs de lotes de esta empresa
  const loteDocs = await Lote.find({
    empresaId: new mongoose.Types.ObjectId(empresaId),
  }).select("_id");
  const loteIds = loteDocs.map((l) => l._id);

  // 2) Busco la última actividad de esos lotes
  const activity = await LoteActivity.findOne({
    loteId: { $in: loteIds },
  })
    .sort({ startTime: -1 })
    .populate("loteId"); // trae completo el documento Lote

  // 3) Si no hay actividad o la última ya está cerrada, no hay lote activo
  if (!activity || activity.endTime !== null) {
    return NextResponse.json(null, { status: 200 });
  }

  // 4) Si está abierta (endTime === null), devuelvo el lote
  const lote = activity.loteId as any;
  return NextResponse.json(
    {
      id: lote._id.toString(),
      nombre: lote.nombre,
      fechaCreacion: lote.fechaCreacion,
    },
    { status: 200 }
  );
}
