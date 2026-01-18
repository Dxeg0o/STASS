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

  // Pagination parameters
  // Default to 0 (no limit) to allow fetching all records as requested by user
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const skip = parseInt(searchParams.get("skip") || "0", 10);

  if (!loteId && !empresaId && !servicioId) {
    return NextResponse.json(
      { error: "loteId, servicioId o empresaId son requeridos" },
      { status: 400 }
    );
  }

  await connectDb();

  // Common projection for optimization
  const projection = "timestamp direction dispositivo id perimeter servicioId";

  // Case 1: Filter by Lote (via Activity ranges)
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
      .sort({ timestamp: -1 }) // Optimized: Descending order
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean();

    return NextResponse.json(conteos);
  }

  // Case 2: Filter by Servicio
  if (servicioId) {
    const conteos = await Conteo.find({ servicioId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean();
    return NextResponse.json(conteos);
  }

  // Case 3: Filter by Empresa (via Servicios)
  if (empresaId) {
    const servicios = await Servicio.find({ empresaId }, { _id: 1 }).lean();
    const servicioIds = servicios.map((s: any) => s._id.toString());
    
    if (!servicioIds.length) {
      return NextResponse.json([]);
    }

    const conteos = await Conteo.find({
      servicioId: { $in: servicioIds },
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean();

    return NextResponse.json(conteos);
  }
}
