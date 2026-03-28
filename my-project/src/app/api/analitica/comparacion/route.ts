import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteStats, servicio, proceso } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteIdsParam = searchParams.get("loteIds");
  const tipoProcesoId = searchParams.get("tipoProcesoId");

  if (!loteIdsParam) {
    return NextResponse.json(
      { error: "loteIds is required (comma-separated)" },
      { status: 400 }
    );
  }

  const loteIds = loteIdsParam.split(",").filter(Boolean);
  if (loteIds.length === 0) {
    return NextResponse.json(
      { error: "At least one loteId is required" },
      { status: 400 }
    );
  }

  // If tipoProcesoId specified, filter servicios by that process type
  let servicioFilter: string[] | null = null;
  if (tipoProcesoId) {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .innerJoin(proceso, eq(proceso.id, servicio.procesoId))
      .where(eq(proceso.tipoProcesoId, tipoProcesoId));
    servicioFilter = servicios.map((s) => s.id);
    if (servicioFilter.length === 0) {
      return NextResponse.json({ lotes: [] });
    }
  }

  const result = [];

  for (const loteId of loteIds) {
    const conditions = [eq(loteStats.loteId, loteId)];
    if (servicioFilter) {
      conditions.push(inArray(loteStats.servicioId, servicioFilter));
    }

    const distribution = await db
      .select({
        calibre: loteStats.calibre,
        count: sql<number>`SUM(${loteStats.countIn} + ${loteStats.countOut})::int`,
      })
      .from(loteStats)
      .where(and(...conditions))
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

    const calibres = distribution.map((d) => d.calibre);

    result.push({
      loteId,
      distribution: distribution.map((d) => ({
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

  return NextResponse.json({ lotes: result });
}
