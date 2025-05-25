// app/api/lotes/activity/last/route.ts
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { LoteActivity } from "@/models/loteactivity";
import { Lote, type LoteDocument } from "@/models/lotes";

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

  // 1) Obtener solo los _id de los lotes de esta empresa
  const loteDocs = await Lote.find({ empresaId: empresaId }, { _id: 1 });
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
