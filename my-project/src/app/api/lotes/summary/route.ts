// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteTotalStats, dispositivo } from "@/db/schema";
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
      servicioId: loteTotalStats.servicioId,
      countIn: sql<number>`SUM(${loteTotalStats.countIn})::int`,
      countOut: sql<number>`SUM(${loteTotalStats.countOut})::int`,
      lastTimestamp: sql<Date>`MAX(${loteTotalStats.lastTs})`,
    })
    .from(loteTotalStats)
    .innerJoin(dispositivo, eq(dispositivo.id, loteTotalStats.dispositivoId))
    .where(eq(loteTotalStats.loteId, loteId))
    .groupBy(dispositivo.nombre, loteTotalStats.servicioId);

  const result = rows.map((r) => ({
    dispositivo: r.dispositivoNombre,
    servicioId: r.servicioId,
    countIn: r.countIn,
    countOut: r.countOut,
    lastTimestamp: r.lastTimestamp ? new Date(r.lastTimestamp).toISOString() : null,
  }));

  return NextResponse.json(result);
}
