// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteStats, dispositivo, lote } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  const rows = await db
    .select({
      dispositivoNombre: dispositivo.nombre,
      countIn: sql<number>`SUM(${loteStats.countIn})::int`,
      countOut: sql<number>`SUM(${loteStats.countOut})::int`,
      lastTimestamp: sql<Date>`MAX(${loteStats.lastTs})`,
      servicioId: lote.servicioId,
    })
    .from(loteStats)
    .innerJoin(dispositivo, eq(dispositivo.id, loteStats.dispositivoId))
    .innerJoin(lote, eq(lote.id, loteStats.loteId))
    .where(eq(loteStats.loteId, loteId))
    .groupBy(dispositivo.nombre, lote.servicioId);

  const result = rows.map((r) => ({
    dispositivo: r.dispositivoNombre,
    countIn: r.countIn,
    countOut: r.countOut,
    lastTimestamp: r.lastTimestamp ? new Date(r.lastTimestamp).toISOString() : null,
    servicioId: r.servicioId,
  }));

  return NextResponse.json(result);
}
