import { NextResponse } from "next/server";
import { db } from "@/db";
import { lote, loteStats, servicio } from "@/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const servicioId = searchParams.get("servicioId");

  if (!empresaId && !servicioId) {
    return NextResponse.json(
      { error: "empresaId or servicioId is required" },
      { status: 400 }
    );
  }

  // Obtener servicioIds
  let servicioIds: string[] = [];
  if (servicioId) {
    servicioIds = [servicioId];
  } else {
    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(eq(servicio.empresaId, empresaId!));
    servicioIds = servicios.map((s) => s.id);
  }

  if (servicioIds.length === 0) return NextResponse.json([]);

  const rows = await db
    .select({
      id: lote.id,
      nombre: lote.nombre,
      conteo: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      firstTimestamp: sql<Date | null>`MIN(${loteStats.firstTs})`,
      lastTimestamp: sql<Date | null>`MAX(${loteStats.lastTs})`,
      createdAt: lote.createdAt,
    })
    .from(lote)
    .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
    .where(inArray(lote.servicioId, servicioIds))
    .groupBy(lote.id, lote.nombre, lote.createdAt)
    .orderBy(desc(lote.createdAt));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      conteo: r.conteo,
      firstTimestamp: r.firstTimestamp ? new Date(r.firstTimestamp).toISOString() : null,
      lastTimestamp: r.lastTimestamp ? new Date(r.lastTimestamp).toISOString() : null,
    }))
  );
}
