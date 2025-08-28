// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import { Lote, type LoteDocument } from "@/models/lotes";
import { Servicio } from "@/models/servicio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  const empresaId = searchParams.get("empresaId");
  if (!servicioId && !empresaId) {
    return NextResponse.json(
      { error: "servicioId or empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();

  // 1) Obtener solo los _id de los lotes del servicio (o empresa)
  let query: Record<string, unknown> = {};
  if (servicioId) {
    query = { servicioId };
  } else if (empresaId) {
    const servicios = await Servicio.find({ empresaId }, { _id: 1 });
    const servicioIds = servicios.map((s) => s._id);
    query = { servicioId: { $in: servicioIds } };
  }
  const loteDocs = await Lote.find(query, { _id: 1 });
  const loteIds = loteDocs.map((l) => l._id);

  // 2) Buscar la última actividad de esos lotes y poblar el documento completo
  const activity = await LoteActivity.findOne(
    { loteId: { $in: loteIds } },
    undefined,
    { sort: { startTime: -1 } }
  ).populate<{ loteId: LoteDocument }>("loteId");

  // 3) Si no hay actividad o ya está cerrada, no hay lote activo
  if (!activity || activity.endTime !== null) {
    return NextResponse.json(null, { status: 200 });
  }

  // 4) Como usamos el genérico en populate, activity.loteId es LoteDocument
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
