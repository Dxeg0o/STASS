import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicio,
  loteStats,
  loteSession,
  loteServicio,
  dispositivoServicio,
  proceso,
  tipoProceso,
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

  // 1. Get servicios for the empresa
  const whereClause = tipo
    ? and(eq(servicio.empresaId, empresaId), eq(servicio.tipo, tipo))
    : eq(servicio.empresaId, empresaId);

  const servicios = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      estado: servicio.estado,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
      procesoId: servicio.procesoId,
      tipoProcesoNombre: tipoProceso.nombre,
      temporada: proceso.temporada,
    })
    .from(servicio)
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(whereClause);

  if (servicios.length === 0) {
    return NextResponse.json([]);
  }

  const servicioIds = servicios.map((s) => s.id);

  // 2. Aggregate lote stats per servicio via loteServicio junction
  const loteAggRows = await db
    .select({
      servicioId: loteServicio.servicioId,
      loteCount: sql<number>`COUNT(DISTINCT ${loteServicio.loteId})::int`,
      totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      lastActivity: sql<Date | null>`MAX(${loteStats.lastTs})`,
    })
    .from(loteServicio)
    .leftJoin(
      loteStats,
      and(
        eq(loteStats.loteId, loteServicio.loteId),
        eq(loteStats.servicioId, loteServicio.servicioId)
      )
    )
    .where(inArray(loteServicio.servicioId, servicioIds))
    .groupBy(loteServicio.servicioId);

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
    .where(
      and(
        inArray(dispositivoServicio.servicioId, servicioIds),
        isNull(dispositivoServicio.fechaTermino)
      )
    )
    .groupBy(dispositivoServicio.servicioId);

  const deviceCountMap = new Map(
    deviceCountRows.map((r) => [r.servicioId, r.deviceCount])
  );

  // 4. Find active loteSession via loteServicio (latest assignment only)
  // Subquery: for each lote, get the most recent assignment timestamp
  const latestAssignment = db
    .select({
      loteId: loteServicio.loteId,
      maxAsignadoAt: sql<Date>`MAX(${loteServicio.asignadoAt})`.as(
        "max_asignado_at"
      ),
    })
    .from(loteServicio)
    .groupBy(loteServicio.loteId)
    .as("latest_assignment");

  const activeSessions = await db
    .select({
      servicioId: loteServicio.servicioId,
      loteId: loteServicio.loteId,
    })
    .from(loteSession)
    .innerJoin(loteServicio, eq(loteServicio.loteId, loteSession.loteId))
    .innerJoin(
      latestAssignment,
      and(
        eq(latestAssignment.loteId, loteServicio.loteId),
        eq(loteServicio.asignadoAt, latestAssignment.maxAsignadoAt)
      )
    )
    .where(
      and(
        isNull(loteSession.endTime),
        inArray(loteServicio.servicioId, servicioIds)
      )
    );

  const activeSessionMap = new Map<string, { id: string }>();
  for (const session of activeSessions) {
    if (!activeSessionMap.has(session.servicioId)) {
      activeSessionMap.set(session.servicioId, {
        id: session.loteId,
      });
    }
  }

  // 5. Build response
  const result = servicios.map((s) => {
    const agg = loteAggMap.get(s.id);
    return {
      id: s.id,
      nombre: s.nombre,
      tipo: s.tipo,
      estado: s.estado,
      fechaInicio: s.fechaInicio ? new Date(s.fechaInicio).toISOString() : null,
      fechaFin: s.fechaFin ? new Date(s.fechaFin).toISOString() : null,
      procesoId: s.procesoId ?? null,
      tipoProcesoNombre: s.tipoProcesoNombre ?? null,
      temporada: s.temporada ?? null,
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
