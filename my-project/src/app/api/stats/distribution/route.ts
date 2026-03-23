import { NextResponse } from "next/server";
import { db } from "@/db";
import { conteo } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface DistributionPoint {
  perimeter: number;
  count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicioId = searchParams.get("servicioId");
  const loteIds = [
    ...searchParams.getAll("loteId"),
    ...(searchParams.get("loteIds")?.split(",") ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  if (!servicioId) {
    return NextResponse.json(
      { error: "servicioId es requerido" },
      { status: 400 }
    );
  }

  if (loteIds.length === 0) {
    return NextResponse.json({ data: [], series: [] });
  }

  // Para cada lote, obtener distribución de perímetros
  const resultByLote: Record<string, DistributionPoint[]> = {};

  await Promise.all(
    loteIds.map(async (loteId) => {
      const rows = await db
        .select({
          perimeter: sql<number>`ROUND(${conteo.perimeter}::numeric, 1)`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(conteo)
        .where(
          and(eq(conteo.servicioId, servicioId), eq(conteo.loteId, loteId))
        )
        .groupBy(sql`ROUND(${conteo.perimeter}::numeric, 1)`)
        .orderBy(sql`ROUND(${conteo.perimeter}::numeric, 1)`);

      resultByLote[loteId] = rows.map((r) => ({
        perimeter: Number(r.perimeter),
        count: r.count,
      }));
    })
  );

  // Combinar en una sola tabla con columna por lote
  const perimeterMap = new Map<number, Record<string, number>>();

  for (const loteId of loteIds) {
    const points = resultByLote[loteId] ?? [];
    for (const point of points) {
      if (point.perimeter == null || isNaN(point.perimeter)) continue;
      const key = Number(point.perimeter.toFixed(1));
      const entry = perimeterMap.get(key) ?? { perimeter: key };
      entry[loteId] = point.count;
      perimeterMap.set(key, entry);
    }
  }

  const data = Array.from(perimeterMap.values()).sort(
    (a, b) => a.perimeter - b.perimeter
  );

  // Rellenar ceros donde no hay datos
  for (const entry of data) {
    for (const loteId of loteIds) {
      if (entry[loteId] === undefined) entry[loteId] = 0;
    }
  }

  return NextResponse.json({
    data,
    series: loteIds.map((loteId) => ({ loteId })),
  });
}
