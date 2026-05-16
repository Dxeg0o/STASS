import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  loteStats,
  loteServicio,
  servicio,
  proceso,
  tipoProceso,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");

  if (!loteId) {
    return NextResponse.json(
      { error: "loteId is required" },
      { status: 400 }
    );
  }

  const steps = await db
    .select({
      servicioId: loteServicio.servicioId,
      asignadoAt: loteServicio.asignadoAt,
      servicioNombre: servicio.nombre,
      tipoProcesoNombre: tipoProceso.nombre,
      procesoTemporada: proceso.temporada,
    })
    .from(loteServicio)
    .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(loteServicio.loteId, loteId))
    .orderBy(loteServicio.asignadoAt);

  const stepsWithDistribution = [];

  for (const step of steps) {
    const distributionRows = await db
      .select({
        calibre: loteStats.calibre,
        count: sql<number>`SUM(${loteStats.countIn} + ${loteStats.countOut})::int`,
      })
      .from(loteStats)
      .where(
        and(
          eq(loteStats.loteId, loteId),
          eq(loteStats.servicioId, step.servicioId)
        )
      )
      .groupBy(loteStats.calibre)
      .orderBy(loteStats.calibre);

    const [tsRow] = await db
      .select({
        firstTs: sql<Date | null>`MIN(${loteStats.firstTs})`,
        lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
      })
      .from(loteStats)
      .where(
        and(
          eq(loteStats.loteId, loteId),
          eq(loteStats.servicioId, step.servicioId)
        )
      );

    const distributionWithCalibre = distributionRows.filter(
      (d): d is typeof d & { calibre: number } => d.calibre != null
    );
    const totalCount = distributionWithCalibre.reduce((sum, d) => sum + d.count, 0);
    const weightedSum = distributionWithCalibre.reduce(
      (sum, d) => sum + d.calibre * d.count,
      0
    );
    const mean = totalCount > 0 ? weightedSum / totalCount : 0;
    const varianceSum = distributionWithCalibre.reduce(
      (sum, d) => sum + d.count * (d.calibre - mean) ** 2,
      0
    );
    const variance = totalCount > 0 ? varianceSum / totalCount : 0;
    const stdDev = Math.sqrt(variance);
    const calibres = distributionWithCalibre.map((d) => d.calibre);

    stepsWithDistribution.push({
      servicioId: step.servicioId,
      servicioNombre: step.servicioNombre,
      tipoProcesoNombre: step.tipoProcesoNombre,
      procesoTemporada: step.procesoTemporada,
      asignadoAt: step.asignadoAt,
      firstTs: tsRow?.firstTs ? new Date(tsRow.firstTs).toISOString() : null,
      lastTs: tsRow?.lastTs ? new Date(tsRow.lastTs).toISOString() : null,
      distribution: distributionRows.map((d) => ({
        calibre: d.calibre,
        count: d.count,
      })),
      stats: {
        totalCount,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        min: calibres.length > 0 ? Math.min(...calibres) : 0,
        max: calibres.length > 0 ? Math.max(...calibres) : 0,
      },
    });
  }

  return NextResponse.json(stepsWithDistribution);
}
