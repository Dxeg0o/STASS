// app/api/conteos/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Conteo } from "@/models/conteo";
import { LoteActivity } from "@/models/loteactivity";
import { Servicio } from "@/models/servicio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  const empresaId = searchParams.get("empresaId");
  const servicioId = searchParams.get("servicioId");

  if (!loteId && !empresaId && !servicioId) {
    return NextResponse.json(
      { error: "loteId, servicioId o empresaId son requeridos" },
      { status: 400 }
    );
  }

  await connectDb();

  // Cuando se solicita por lote, usamos las actividades para obtener rangos de tiempo
  if (loteId) {
    const activities = await LoteActivity.find({
      loteId: new mongoose.Types.ObjectId(loteId),
    }).lean();

    if (!activities.length) {
      return NextResponse.json([]);
    }

    const now = new Date();
    const orConds = activities.map(({ startTime, endTime }) => ({
      timestamp: { $gte: startTime, $lte: endTime ?? now },
    }));

    const query: Record<string, unknown> = { $or: orConds };
    if (servicioId) {
      query.servicioId = servicioId;
    }

    const conteos = await Conteo.find(query)
      .sort({ timestamp: 1 })
      .select("timestamp direction dispositivo id perimeter servicioId")
      .lean();

    return NextResponse.json(conteos);
  }

  // Si se proporciona servicio, obtenemos todos los conteos asociados
  if (servicioId) {
    const conteos = await Conteo.find({ servicioId })
      .sort({ timestamp: 1 })
      .select("timestamp direction dispositivo id perimeter servicioId")
      .lean();
    return NextResponse.json(conteos);
  }

  // Finalmente, podemos filtrar por empresa obteniendo todos sus servicios
  if (empresaId) {
    const servicios = await Servicio.find({ empresaId }, { _id: 1 });
    const servicioIds = servicios.map((s) => s._id.toString());
    if (!servicioIds.length) {
      return NextResponse.json([]);
    }
    const conteos = await Conteo.find({
      servicioId: { $in: servicioIds },
    })
      .sort({ timestamp: 1 })
      .select("timestamp direction dispositivo id perimeter servicioId")
      .lean();

    return NextResponse.json(conteos);
  }
}
