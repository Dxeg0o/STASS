import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicio,
  lote,
  loteStats,
  loteSession,
  dispositivoServicio,
} from "@/db/schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId es requerido" },
      { status: 400 }
    );
  }

  const tipo = searchParams.get("tipo");

  // 1. Get servicios for the empresa (optionally filtered by tipo)
  const whereClause = tipo
    ? and(eq(servicio.empresaId, empresaId), eq(servicio.tipo, tipo))
    : eq(servicio.empresaId, empresaId);

  const servicios = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
    })
    .from(servicio)
    .where(whereClause);

  if (servicios.length === 0) {
    return NextResponse.json([]);
  }

  const servicioIds = servicios.map((s) => s.id);

  // 2. Aggregate lote stats per servicio (total count, lastActivity, loteCount)
  const loteAggRows = await db
    .select({
      servicioId: lote.servicioId,
      loteCount: sql<number>`COUNT(DISTINCT ${lote.id})::int`,
      totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      lastActivity: sql<Date | null>`MAX(${loteStats.lastTs})`,
    })
    .from(lote)
    .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
    .where(inArray(lote.servicioId, servicioIds))
    .groupBy(lote.servicioId);

  const loteAggMap = new Map(
    loteAggRows.map((r) => [r.servicioId, r])
  );

  // 3. Count devices per servicio
  const deviceCountRows = await db
    .select({
      servicioId: dispositivoServicio.servicioId,
      deviceCount: sql<number>`COUNT(*)::int`,
    })
    .from(dispositivoServicio)
    .where(inArray(dispositivoServicio.servicioId, servicioIds))
    .groupBy(dispositivoServicio.servicioId);

  const deviceCountMap = new Map(
    deviceCountRows.map((r) => [r.servicioId, r.deviceCount])
  );

  // 4. Find active loteSession (endTime IS NULL) for each servicio
  //    Join loteSession -> lote to get servicioId
  const activeSessions = await db
    .select({
      servicioId: lote.servicioId,
      loteId: lote.id,
      loteNombre: lote.nombre,
    })
    .from(loteSession)
    .innerJoin(lote, eq(lote.id, loteSession.loteId))
    .where(
      and(
        isNull(loteSession.endTime),
        inArray(lote.servicioId, servicioIds)
      )
    );

  // Use the first active session found per servicio
  const activeSessionMap = new Map<
    string,
    { id: string; nombre: string }
  >();
  for (const session of activeSessions) {
    if (!activeSessionMap.has(session.servicioId)) {
      activeSessionMap.set(session.servicioId, {
        id: session.loteId,
        nombre: session.loteNombre,
      });
    }
  }

  // 5. Build the enriched response
  const result = servicios.map((s) => {
    const agg = loteAggMap.get(s.id);
    return {
      id: s.id,
      nombre: s.nombre,
      tipo: s.tipo,
      fechaInicio: s.fechaInicio ? new Date(s.fechaInicio).toISOString() : null,
      fechaFin: s.fechaFin ? new Date(s.fechaFin).toISOString() : null,
      loteCount: agg?.loteCount ?? 0,
      totalCount: agg?.totalCount ?? 0,
      lastActivity: agg?.lastActivity
        ? new Date(agg.lastActivity).toISOString()
        : null,
      activeLote: activeSessionMap.get(s.id) ?? null,
      deviceCount: deviceCountMap.get(s.id) ?? 0,
    };
  });

  return NextResponse.json(result);
}
