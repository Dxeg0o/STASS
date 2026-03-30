import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteSession,
  loteStats,
  servicio,
  variedad,
  producto,
  proceso,
  tipoProceso,
  dispositivo,
} from "@/db/schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const { loteId } = await params;

  // 1. Fetch lote basic info
  const loteRow = await db
    .select({
      id: lote.id,
      createdAt: lote.createdAt,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(eq(lote.id, loteId))
    .limit(1);

  if (loteRow.length === 0) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }

  const loteInfo = loteRow[0];

  // 2. Fetch lifecycle (service assignments with process context)
  const lifecycle = await db
    .select({
      servicioId: loteServicio.servicioId,
      asignadoAt: loteServicio.asignadoAt,
      servicioNombre: servicio.nombre,
      servicioTipo: servicio.tipo,
      procesoId: proceso.id,
      procesoEstado: proceso.estado,
      procesoTemporada: proceso.temporada,
      tipoProcesoNombre: tipoProceso.nombre,
    })
    .from(loteServicio)
    .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(loteServicio.loteId, loteId))
    .orderBy(loteServicio.asignadoAt);

  // 3. Check active sessions
  const activeSessions = await db
    .select({
      id: loteSession.id,
      dispositivoId: loteSession.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      startTime: loteSession.startTime,
    })
    .from(loteSession)
    .innerJoin(dispositivo, eq(dispositivo.id, loteSession.dispositivoId))
    .where(
      and(eq(loteSession.loteId, loteId), isNull(loteSession.endTime))
    );

  // 4. Aggregated stats per service
  const statsPerService = await db
    .select({
      servicioId: loteStats.servicioId,
      totalIn: sql<number>`SUM(${loteStats.countIn})::int`,
      totalOut: sql<number>`SUM(${loteStats.countOut})::int`,
      firstTs: sql<string | null>`MIN(${loteStats.firstTs})`,
      lastTs: sql<string | null>`MAX(${loteStats.lastTs})`,
    })
    .from(loteStats)
    .where(eq(loteStats.loteId, loteId))
    .groupBy(loteStats.servicioId);

  const statsMap = new Map(statsPerService.map((s) => [s.servicioId, s]));

  // 5. Total aggregated stats
  const totalStats = await db
    .select({
      totalIn: sql<number>`COALESCE(SUM(${loteStats.countIn}), 0)::int`,
      totalOut: sql<number>`COALESCE(SUM(${loteStats.countOut}), 0)::int`,
    })
    .from(loteStats)
    .where(eq(loteStats.loteId, loteId));

  // 6. Device breakdown
  const deviceStats = await db
    .select({
      dispositivoId: loteStats.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      totalIn: sql<number>`SUM(${loteStats.countIn})::int`,
      totalOut: sql<number>`SUM(${loteStats.countOut})::int`,
      lastTs: sql<string | null>`MAX(${loteStats.lastTs})`,
    })
    .from(loteStats)
    .innerJoin(dispositivo, eq(dispositivo.id, loteStats.dispositivoId))
    .where(eq(loteStats.loteId, loteId))
    .groupBy(loteStats.dispositivoId, dispositivo.nombre);

  // 7. Check if any service uses cajas
  const servicioIds = lifecycle.map((l) => l.servicioId);
  let hasCajas = false;
  if (servicioIds.length > 0) {
    const serviciosWithCajas = await db
      .select({ usaCajas: servicio.usaCajas })
      .from(servicio)
      .where(
        and(
          eq(servicio.usaCajas, true),
          inArray(servicio.id, servicioIds)
        )
      )
      .limit(1);
    hasCajas = serviciosWithCajas.length > 0;
  }

  // Build lifecycle steps with stats
  const steps = lifecycle.map((step) => {
    const stats = statsMap.get(step.servicioId);

    return {
      servicioId: step.servicioId,
      servicioNombre: step.servicioNombre,
      servicioTipo: step.servicioTipo,
      procesoId: step.procesoId,
      procesoEstado: step.procesoEstado,
      procesoTemporada: step.procesoTemporada,
      tipoProcesoNombre: step.tipoProcesoNombre,
      asignadoAt: step.asignadoAt,
      totalIn: stats?.totalIn ?? 0,
      totalOut: stats?.totalOut ?? 0,
      firstTs: stats?.firstTs ?? null,
      lastTs: stats?.lastTs ?? null,
    };
  });

  return NextResponse.json({
    id: loteInfo.id,
    createdAt: loteInfo.createdAt,
    variedadNombre: loteInfo.variedadNombre,
    productoNombre: loteInfo.productoNombre,
    lifecycle: steps,
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      dispositivoNombre: s.dispositivoNombre,
      startTime: s.startTime,
    })),
    totalStats: {
      totalIn: totalStats[0]?.totalIn ?? 0,
      totalOut: totalStats[0]?.totalOut ?? 0,
    },
    devices: deviceStats.map((d) => ({
      dispositivoNombre: d.dispositivoNombre,
      totalIn: d.totalIn,
      totalOut: d.totalOut,
      lastTs: d.lastTs,
    })),
    hasCajas,
  });
}
