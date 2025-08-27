import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import { Lote } from "@/models/lotes";
import { LoteActivity } from "@/models/loteactivity";
import { Conteo } from "@/models/conteo";

interface LoteCount {
  id: string;
  nombre: string;
  conteo: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const servicioId = searchParams.get("servicioId");
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();

  // Obtener todos los lotes de la empresa
  const lotes = await Lote.find({ empresaId })
    .sort({ fechaCreacion: -1 })
    .lean();
  const now = new Date();

  const summaries: LoteCount[] = await Promise.all(
    lotes.map(async (lote) => {
      // Sesiones de actividad para este lote
      const acts = await LoteActivity.find({ loteId: lote._id }).lean();
      if (acts.length === 0) {
        return {
          id: lote._id.toString(),
          nombre: lote.nombre,
          conteo: 0,
          firstTimestamp: null,
          lastTimestamp: null,
        };
      }
      const orConds = acts.map(({ startTime, endTime }) => ({
        timestamp: { $gte: startTime, $lte: endTime ?? now },
      }));
      const matchStage: Record<string, unknown> = { $or: orConds };
      if (servicioId) matchStage.servicioId = servicioId;
      const agg = await Conteo.aggregate<{
        totalIn: number;
        totalOut: number;
      }>([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalIn: {
              $sum: { $cond: [{ $eq: ["$direction", "in"] }, 1, 0] },
            },
            totalOut: {
              $sum: { $cond: [{ $eq: ["$direction", "out"] }, 1, 0] },
            },
          },
        },
      ]);
      const total = agg[0] ? agg[0].totalIn + agg[0].totalOut : 0;

      const last = await Conteo.findOne({ $or: orConds, ...(servicioId ? { servicioId } : {}) })
        .sort({ timestamp: -1 })
        .lean();
      const first = await Conteo.findOne({ $or: orConds, ...(servicioId ? { servicioId } : {}) })
        .sort({ timestamp: 1 })
        .lean();

      return {
        id: lote._id.toString(),
        nombre: lote.nombre,
        conteo: total,
        firstTimestamp:
          first &&
          typeof first === "object" &&
          "timestamp" in first &&
          first.timestamp instanceof Date
            ? first.timestamp.toISOString()
            : null,
        lastTimestamp:
          last &&
          typeof last === "object" &&
          "timestamp" in last &&
          last.timestamp instanceof Date
            ? last.timestamp.toISOString()
            : null,
      };
    })
  );

  return NextResponse.json(summaries);
}
