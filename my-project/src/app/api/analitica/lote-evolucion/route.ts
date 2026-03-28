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

  // Get the lote's service assignments with process context, ordered
  const steps = await db
    .select({
      servicioId: loteServicio.servicioId,
      asignadoAt: loteServicio.asignadoAt,
      servicioNombre: servicio.nombre,
      tipoProcesoNombre: tipoProceso.nombre,
    })
    .from(loteServicio)
    .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(loteServicio.loteId, loteId))
    .orderBy(loteServicio.asignadoAt);

  // For each step, get caliber distribution
  const stepsWithDistribution = [];

  for (const step of steps) {
    const distribution = await db
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

    const totalCount = distribution.reduce((sum, d) => sum + d.count, 0);
    const weightedSum = distribution.reduce(
      (sum, d) => sum + d.calibre * d.count,
      0
    );
    const mean = totalCount > 0 ? weightedSum / totalCount : 0;
    const varianceSum = distribution.reduce(
      (sum, d) => sum + d.count * (d.calibre - mean) ** 2,
      0
    );
    const variance = totalCount > 0 ? varianceSum / totalCount : 0;
    const stdDev = Math.sqrt(variance);

    stepsWithDistribution.push({
      servicioId: step.servicioId,
      servicioNombre: step.servicioNombre,
      tipoProcesoNombre: step.tipoProcesoNombre,
      asignadoAt: step.asignadoAt,
      distribution: distribution.map((d) => ({
        calibre: d.calibre,
        count: d.count,
      })),
      stats: {
        totalCount,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        variance: Math.round(variance * 100) / 100,
      },
    });
  }

  return NextResponse.json(stepsWithDistribution);
}
