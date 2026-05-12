import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteServicio, loteStats, producto, variedad } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

interface ExportAccumulator {
  loteId: string;
  codigoLote: string | null;
  producto: string | null;
  variedad: string | null;
  fechaInicio: Date | null;
  fechaTermino: Date | null;
  conteoTotal: number;
  weightedSum: number;
  weightedSquareSum: number;
  distribution: Map<number, number>;
}

function toIso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  const { servicioId } = await params;

  const loteRows = await db
    .select({
      loteId: lote.id,
      codigoLote: lote.codigoLote,
      producto: producto.nombre,
      variedad: variedad.nombre,
      createdAt: lote.createdAt,
    })
    .from(loteServicio)
    .innerJoin(lote, eq(lote.id, loteServicio.loteId))
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(eq(loteServicio.servicioId, servicioId))
    .orderBy(desc(lote.createdAt));

  if (loteRows.length === 0) {
    return NextResponse.json({ rows: [], calibreRanges: [] });
  }

  const accumulators = new Map<string, ExportAccumulator>();

  for (const row of loteRows) {
    accumulators.set(row.loteId, {
      loteId: row.loteId,
      codigoLote: row.codigoLote,
      producto: row.producto ?? null,
      variedad: row.variedad ?? null,
      fechaInicio: null,
      fechaTermino: null,
      conteoTotal: 0,
      weightedSum: 0,
      weightedSquareSum: 0,
      distribution: new Map(),
    });
  }

  const statsRows = await db
    .select({
      loteId: loteStats.loteId,
      calibre: loteStats.calibre,
      count: sql<number>`(${loteStats.countIn} + ${loteStats.countOut})::int`,
      firstTs: loteStats.firstTs,
      lastTs: loteStats.lastTs,
    })
    .from(loteStats)
    .where(
      and(
        eq(loteStats.servicioId, servicioId),
        inArray(
          loteStats.loteId,
          loteRows.map((row) => row.loteId)
        )
      )
    );

  const buckets = new Set<number>();

  for (const stat of statsRows) {
    const acc = accumulators.get(stat.loteId);
    if (!acc) continue;

    const count = Number(stat.count) || 0;
    const calibre = Number(stat.calibre);
    if (count <= 0 || stat.calibre == null || !Number.isFinite(calibre)) continue;

    const bucket = Math.floor(calibre);
    buckets.add(bucket);

    acc.conteoTotal += count;
    acc.weightedSum += calibre * count;
    acc.weightedSquareSum += calibre * calibre * count;
    acc.distribution.set(bucket, (acc.distribution.get(bucket) ?? 0) + count);

    if (stat.firstTs && (!acc.fechaInicio || stat.firstTs < acc.fechaInicio)) {
      acc.fechaInicio = stat.firstTs;
    }
    if (stat.lastTs && (!acc.fechaTermino || stat.lastTs > acc.fechaTermino)) {
      acc.fechaTermino = stat.lastTs;
    }
  }

  const calibreRanges = Array.from(buckets)
    .sort((a, b) => a - b)
    .map((bucket) => ({
      bucket,
      label: `Calibre ${bucket}-${bucket + 1} cm`,
    }));

  const rows = loteRows.map((loteRow) => {
    const acc = accumulators.get(loteRow.loteId)!;
    const mean =
      acc.conteoTotal > 0 ? acc.weightedSum / acc.conteoTotal : null;
    const variance =
      mean === null
        ? null
        : acc.weightedSquareSum / acc.conteoTotal - mean * mean;
    const desviacionEstandar =
      variance === null ? null : Math.sqrt(Math.max(variance, 0));

    return {
      loteId: acc.loteId,
      codigoLote: acc.codigoLote,
      producto: acc.producto,
      variedad: acc.variedad,
      fechaInicio: toIso(acc.fechaInicio),
      fechaTermino: toIso(acc.fechaTermino),
      conteoTotal: acc.conteoTotal,
      desviacionEstandar,
      distribucion: Object.fromEntries(
        calibreRanges.map(({ bucket }) => [
          bucket.toString(),
          acc.distribution.get(bucket) ?? 0,
        ])
      ),
    };
  });

  return NextResponse.json({ rows, calibreRanges });
}
