import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicio,
  lote,
  loteStats,
  loteSession,
  dispositivo,
  dispositivoServicio,
  variedad,
  producto,
} from "@/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  const { servicioId } = await params;

  // 1. Get the servicio by id
  const [found] = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      fechaInicio: servicio.fechaInicio,
      fechaFin: servicio.fechaFin,
    })
    .from(servicio)
    .where(eq(servicio.id, servicioId));

  if (!found) {
    return NextResponse.json({ error: "Servicio not found" }, { status: 404 });
  }

  // 2. Get devices via dispositivoServicio join
  const deviceRows = await db
    .select({
      id: dispositivo.id,
      nombre: dispositivo.nombre,
      tipo: dispositivo.tipo,
      activo: dispositivo.activo,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(eq(dispositivoServicio.servicioId, servicioId));

  // 3. Get last 10 lotes with aggregated stats, joining variedad + producto
  const loteRows = await db
    .select({
      id: lote.id,
      nombre: lote.nombre,
      createdAt: lote.createdAt,
      totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
      variedadNombre: variedad.nombre,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(eq(lote.servicioId, servicioId))
    .groupBy(
      lote.id,
      lote.nombre,
      lote.createdAt,
      variedad.nombre,
      producto.nombre
    )
    .orderBy(desc(lote.createdAt))
    .limit(10);

  // 4. Get active loteSession (endTime IS NULL) for this servicio
  const activeSessions = await db
    .select({
      loteId: lote.id,
      loteNombre: lote.nombre,
    })
    .from(loteSession)
    .innerJoin(lote, eq(lote.id, loteSession.loteId))
    .where(
      and(
        eq(lote.servicioId, servicioId),
        isNull(loteSession.endTime)
      )
    )
    .limit(1);

  const activeLote =
    activeSessions.length > 0
      ? { id: activeSessions[0].loteId, nombre: activeSessions[0].loteNombre }
      : null;

  // 5. Aggregate total count from loteStats across all lotes of this servicio
  const [totalRow] = await db
    .select({
      totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      loteCount: sql<number>`COUNT(DISTINCT ${lote.id})::int`,
    })
    .from(lote)
    .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
    .where(eq(lote.servicioId, servicioId));

  return NextResponse.json({
    id: found.id,
    nombre: found.nombre,
    tipo: found.tipo,
    fechaInicio: found.fechaInicio ? new Date(found.fechaInicio).toISOString() : null,
    fechaFin: found.fechaFin ? new Date(found.fechaFin).toISOString() : null,
    totalCount: totalRow?.totalCount ?? 0,
    loteCount: totalRow?.loteCount ?? 0,
    activeLote,
    devices: deviceRows.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      activo: d.activo,
    })),
    recentLotes: loteRows.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      totalCount: l.totalCount,
      lastTs: l.lastTs ? new Date(l.lastTs).toISOString() : null,
      variedadNombre: l.variedadNombre ?? null,
      productoNombre: l.productoNombre ?? null,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
    })),
  });
}
