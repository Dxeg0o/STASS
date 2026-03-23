// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { conteo, dispositivo } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  // Agrupar conteos del lote por dispositivo
  const rows = await db
    .select({
      dispositivoNombre: dispositivo.nombre,
      countIn: sql<number>`SUM(CASE WHEN ${conteo.direction} = 0 THEN 1 ELSE 0 END)::int`,
      countOut: sql<number>`SUM(CASE WHEN ${conteo.direction} = 1 THEN 1 ELSE 0 END)::int`,
      lastTimestamp: sql<Date>`MAX(${conteo.ts})`,
      servicioId: conteo.servicioId,
    })
    .from(conteo)
    .innerJoin(dispositivo, eq(dispositivo.id, conteo.dispositivoId))
    .where(eq(conteo.loteId, loteId))
    .groupBy(dispositivo.nombre, conteo.servicioId);

  const result = rows.map((r) => ({
    dispositivo: r.dispositivoNombre,
    countIn: r.countIn,
    countOut: r.countOut,
    lastTimestamp: r.lastTimestamp ? new Date(r.lastTimestamp).toISOString() : null,
    servicioId: r.servicioId,
  }));

  return NextResponse.json(result);
}
