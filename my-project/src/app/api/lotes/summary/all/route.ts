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
  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  await connectDb();

  // Obtener todos los lotes de la empresa
  const lotes = await Lote.find({ empresaId }).sort({ fechaCreacion: -1 }).lean();
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
      const agg = await Conteo.aggregate<{
        totalIn: number;
        totalOut: number;
      }>([
        { $match: { $or: orConds } },
        {
          $group: {
            _id: null,
            totalIn: { $sum: "$count_in" },
            totalOut: { $sum: "$count_out" },
          },
        },
      ]);
      const total = agg[0] ? agg[0].totalIn + agg[0].totalOut : 0;

      const last = await Conteo.findOne({ $or: orConds })
        .sort({ timestamp: -1 })
        .lean();
      const first = await Conteo.findOne({ $or: orConds })
        .sort({ timestamp: 1 })
        .lean();

      return {
        id: lote._id.toString(),
        nombre: lote.nombre,
        conteo: total,
        firstTimestamp: first ? first.timestamp.toISOString() : null,
        lastTimestamp: last ? last.timestamp.toISOString() : null,
      };
    })
  );

  return NextResponse.json(summaries);
}
