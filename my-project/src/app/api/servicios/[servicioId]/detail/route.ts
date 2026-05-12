import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicio,
  lote,
  loteTotalStats,
  loteSession,
  loteServicio,
  dispositivo,
  dispositivoServicio,
  variedad,
  producto,
  proceso,
  tipoProceso,
} from "@/db/schema";
import { eq, and, isNull, sql, desc, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  const { servicioId } = await params;

  // 1. Get the servicio with proceso context
  const [found] = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      estado: servicio.estado,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
      usaCajas: servicio.usaCajas,
      procesoId: servicio.procesoId,
      tipoProcesoNombre: tipoProceso.nombre,
      procesoTemporada: proceso.temporada,
      procesoEstado: proceso.estado,
    })
    .from(servicio)
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(servicio.id, servicioId));

  if (!found) {
    return NextResponse.json({ error: "Servicio not found" }, { status: 404 });
  }

  // 2. Get devices
  const deviceRows = await db
    .select({
      id: dispositivo.id,
      nombre: dispositivo.nombre,
      tipo: dispositivo.tipo,
      activo: dispositivo.activo,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(
      and(
        eq(dispositivoServicio.servicioId, servicioId),
        isNull(dispositivoServicio.fechaTermino)
      )
    );

  // 3. Get lotes via loteServicio, with stats
  const loteIdsRows = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(eq(loteServicio.servicioId, servicioId));

  const loteIds = loteIdsRows.map((r) => r.loteId);

  let loteRows: {
    id: string;
    codigoLote: string | null;
    createdAt: Date | null;
    totalCount: number;
    lastTs: Date | null;
    variedadNombre: string | null;
    productoNombre: string | null;
  }[] = [];

  if (loteIds.length > 0) {
    loteRows = await db
      .select({
        id: lote.id,
        codigoLote: lote.codigoLote,
        createdAt: lote.createdAt,
        totalCount: sql<number>`COALESCE(SUM(${loteTotalStats.countIn} + ${loteTotalStats.countOut}), 0)::int`,
        lastTs: sql<Date | null>`MAX(${loteTotalStats.lastTs})`,
        variedadNombre: variedad.nombre,
        productoNombre: producto.nombre,
      })
      .from(lote)
      .leftJoin(
        loteTotalStats,
        and(
          eq(loteTotalStats.loteId, lote.id),
          eq(loteTotalStats.servicioId, servicioId)
        )
      )
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .where(inArray(lote.id, loteIds))
      .groupBy(lote.id, lote.codigoLote, lote.createdAt, variedad.nombre, producto.nombre)
      .orderBy(desc(lote.createdAt))
      .limit(10);
  }

  // 4. Get active loteSession for this servicio's lotes
  let activeLote: { id: string; codigoLote: string | null } | null = null;
  if (loteIds.length > 0) {
    const activeSessions = await db
      .select({ loteId: loteSession.loteId, codigoLote: lote.codigoLote })
      .from(loteSession)
      .innerJoin(lote, eq(lote.id, loteSession.loteId))
      .where(
        and(
          inArray(loteSession.loteId, loteIds),
          isNull(loteSession.endTime)
        )
      )
      .limit(1);

    if (activeSessions.length > 0) {
      activeLote = {
        id: activeSessions[0].loteId,
        codigoLote: activeSessions[0].codigoLote,
      };
    }
  }

  // 5. Aggregate total for this servicio
  let totalCount = 0;
  const loteCount = loteIds.length;
  if (loteIds.length > 0) {
    const [totalRow] = await db
      .select({
        totalCount: sql<number>`COALESCE(SUM(${loteTotalStats.countIn} + ${loteTotalStats.countOut}), 0)::int`,
      })
      .from(loteTotalStats)
      .where(
        and(
          inArray(loteTotalStats.loteId, loteIds),
          eq(loteTotalStats.servicioId, servicioId)
        )
      );
    totalCount = totalRow?.totalCount ?? 0;
  }

  return NextResponse.json({
    id: found.id,
    nombre: found.nombre,
    tipo: found.tipo,
    estado: found.estado,
    usaCajas: found.usaCajas,
    fechaInicio: found.fechaInicio ? new Date(found.fechaInicio).toISOString() : null,
    fechaFin: found.fechaFin ? new Date(found.fechaFin).toISOString() : null,
    proceso: found.procesoId
      ? {
          id: found.procesoId,
          tipoProceso: found.tipoProcesoNombre,
          temporada: found.procesoTemporada,
          estado: found.procesoEstado,
        }
      : null,
    totalCount,
    loteCount,
    activeLote,
    devices: deviceRows.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      activo: d.activo,
    })),
    recentLotes: loteRows.map((l) => ({
      id: l.id,
      codigoLote: l.codigoLote,
      totalCount: l.totalCount,
      lastTs: l.lastTs ? new Date(l.lastTs).toISOString() : null,
      variedadNombre: l.variedadNombre ?? null,
      productoNombre: l.productoNombre ?? null,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
    })),
  });
}
