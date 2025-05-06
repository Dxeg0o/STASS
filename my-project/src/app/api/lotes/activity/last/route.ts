// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import mongoose from "mongoose";

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

  // 1) Buscamos sesión abierta (endTime: null) para esta empresa
  const activity = await LoteActivity.findOne({ endTime: null })
    .sort({ startTime: -1 })
    .populate({
      path: "loteId",
      match: { empresaId: new mongoose.Types.ObjectId(empresaId) },
    });

  if (!activity?.loteId) {
    // Si no hay sesión abierta, devolvemos null
    return NextResponse.json(null, { status: 200 });
  }

  const lote = activity.loteId;
  return NextResponse.json(
    {
      id: lote._id.toString(),
      nombre: lote.nombre,
      fechaCreacion: lote.fechaCreacion,
    },
    { status: 200 }
  );
}
