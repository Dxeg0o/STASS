import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicio,
  loteServicio,
  loteSession,
  loteStats,
  lote,
  variedad,
  producto,
  dispositivoServicio,
} from "@/db/schema";
import { eq, and, isNull, inArray, sql, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  const { procesoId } = await params;

  // 1. Get all servicios for this proceso
  const servicios = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      usaCajas: servicio.usaCajas,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
    })
    .from(servicio)
    .where(eq(servicio.procesoId, procesoId));

  if (servicios.length === 0) {
    return NextResponse.json([]);
  }

  const servicioIds = servicios.map((s) => s.id);

  // 2. Get all lote assignments for these servicios
  const loteAssignments = await db
    .select({
      loteId: loteServicio.loteId,
      servicioId: loteServicio.servicioId,
      asignadoAt: loteServicio.asignadoAt,
      variedadNombre: variedad.nombre,
      productoNombre: producto.nombre,
      createdAt: lote.createdAt,
    })
    .from(loteServicio)
    .innerJoin(lote, eq(lote.id, loteServicio.loteId))
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(inArray(loteServicio.servicioId, servicioIds))
    .orderBy(desc(loteServicio.asignadoAt));

  // 3. Get active sessions
  const allLoteIds = [...new Set(loteAssignments.map((a) => a.loteId))];
  const activeSessions =
    allLoteIds.length > 0
      ? await db
          .select({
            loteId: loteSession.loteId,
            dispositivoId: loteSession.dispositivoId,
            startTime: loteSession.startTime,
          })
          .from(loteSession)
          .where(
            and(
              inArray(loteSession.loteId, allLoteIds),
              isNull(loteSession.endTime)
            )
          )
      : [];
  const activeLoteIds = new Set(activeSessions.map((s) => s.loteId));

  // 4. Get aggregated stats per lote per servicio
  const stats =
    allLoteIds.length > 0
      ? await db
          .select({
            loteId: loteStats.loteId,
            servicioId: loteStats.servicioId,
            totalCount: sql<number>`SUM(${loteStats.countIn} + ${loteStats.countOut})::int`,
            lastTs: sql<string | null>`MAX(${loteStats.lastTs})`,
          })
          .from(loteStats)
          .where(
            and(
              inArray(loteStats.loteId, allLoteIds),
              inArray(loteStats.servicioId, servicioIds)
            )
          )
          .groupBy(loteStats.loteId, loteStats.servicioId)
      : [];

  const statsMap = new Map<string, { totalCount: number; lastTs: string | null }>();
  for (const s of stats) {
    statsMap.set(`${s.loteId}:${s.servicioId}`, {
      totalCount: s.totalCount,
      lastTs: s.lastTs,
    });
  }

  // 5. Get device counts per servicio
  const deviceCounts = await db
    .select({
      servicioId: dispositivoServicio.servicioId,
      count: sql<number>`count(*)::int`,
    })
    .from(dispositivoServicio)
    .where(inArray(dispositivoServicio.servicioId, servicioIds))
    .groupBy(dispositivoServicio.servicioId);

  const deviceCountMap = new Map(deviceCounts.map((d) => [d.servicioId, d.count]));

  // 6. Build response
  const result = servicios.map((s) => {
    const servicioLotes = loteAssignments.filter((a) => a.servicioId === s.id);
    const enProceso = servicioLotes.filter((l) => activeLoteIds.has(l.loteId));
    const otros = servicioLotes.filter((l) => !activeLoteIds.has(l.loteId));

    // Total stats for this servicio
    let servicioTotalCount = 0;
    for (const l of servicioLotes) {
      const stat = statsMap.get(`${l.loteId}:${s.id}`);
      if (stat) servicioTotalCount += stat.totalCount;
    }

    const buildLoteInfo = (assignment: (typeof loteAssignments)[0]) => {
      const stat = statsMap.get(`${assignment.loteId}:${s.id}`);
      return {
        loteId: assignment.loteId,
        variedadNombre: assignment.variedadNombre,
        productoNombre: assignment.productoNombre,
        asignadoAt: assignment.asignadoAt,
        createdAt: assignment.createdAt,
        totalCount: stat?.totalCount ?? 0,
        lastTs: stat?.lastTs ?? null,
        isActive: activeLoteIds.has(assignment.loteId),
      };
    };

    return {
      id: s.id,
      nombre: s.nombre,
      tipo: s.tipo,
      usaCajas: s.usaCajas,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      deviceCount: deviceCountMap.get(s.id) ?? 0,
      totalCount: servicioTotalCount,
      loteCount: servicioLotes.length,
      lotesEnProceso: enProceso.map(buildLoteInfo),
      lotesOtros: otros.map(buildLoteInfo),
    };
  });

  return NextResponse.json(result);
}
