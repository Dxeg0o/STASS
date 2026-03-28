// app/api/dashboard/overview/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  empresa,
  servicio,
  lote,
  loteSession,
  loteStats,
  loteServicio,
  dispositivo,
} from "@/db/schema";
import { eq, inArray, desc, sql, isNull, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  // 1. Get empresa
  const [empresaData] = await db
    .select({ id: empresa.id, nombre: empresa.nombre, pais: empresa.pais })
    .from(empresa)
    .where(eq(empresa.id, empresaId));

  if (!empresaData) {
    return NextResponse.json({ error: "Empresa not found" }, { status: 404 });
  }

  // 2. Get all servicios for this empresa
  const servicios = await db
    .select({ id: servicio.id, tipo: servicio.tipo, nombre: servicio.nombre })
    .from(servicio)
    .where(eq(servicio.empresaId, empresaId));

  const servicioIds = servicios.map((s) => s.id);

  // 3. Build serviceTypeSummary
  let serviceTypeSummary: {
    tipo: string;
    count: number;
    totalBulbs: number;
    lastActivity: string | null;
  }[] = [];

  if (servicioIds.length > 0) {
    // Get stats aggregated by servicio via loteStats.servicioId
    const statsRows = await db
      .select({
        servicioId: loteStats.servicioId,
        totalBulbs: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
        lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
      })
      .from(loteStats)
      .where(inArray(loteStats.servicioId, servicioIds))
      .groupBy(loteStats.servicioId);

    const statsMap = new Map(statsRows.map((r) => [r.servicioId, r]));

    // Group by tipo
    type TipoAcc = { count: number; totalBulbs: number; lastTs: Date | null };
    const tipoMap = new Map<string, TipoAcc>();

    for (const s of servicios) {
      if (!tipoMap.has(s.tipo)) {
        tipoMap.set(s.tipo, { count: 0, totalBulbs: 0, lastTs: null });
      }
      const entry = tipoMap.get(s.tipo)!;
      entry.count++;

      const stats = statsMap.get(s.id);
      if (stats) {
        entry.totalBulbs += stats.totalBulbs;
        if (stats.lastTs) {
          const ts = new Date(stats.lastTs);
          if (!entry.lastTs || ts > entry.lastTs) entry.lastTs = ts;
        }
      }
    }

    serviceTypeSummary = Array.from(tipoMap.entries()).map(([tipo, acc]) => ({
      tipo,
      count: acc.count,
      totalBulbs: acc.totalBulbs,
      lastActivity: acc.lastTs ? acc.lastTs.toISOString() : null,
    }));
  }

  // 4. Get active sessions
  let activeSessions: {
    loteId: string;
    servicioNombre: string;
    dispositivoNombre: string;
    startTime: string;
  }[] = [];

  if (servicioIds.length > 0) {
    // Get loteIds via loteServicio
    const loteIdsRows = await db
      .select({ loteId: loteServicio.loteId, servicioId: loteServicio.servicioId })
      .from(loteServicio)
      .where(inArray(loteServicio.servicioId, servicioIds));

    const loteIds = [...new Set(loteIdsRows.map((l) => l.loteId))];
    const loteToServicioMap = new Map(loteIdsRows.map((l) => [l.loteId, l.servicioId]));

    if (loteIds.length > 0) {
      const sessionRows = await db
        .select({
          loteId: loteSession.loteId,
          dispositivoNombre: dispositivo.nombre,
          startTime: loteSession.startTime,
        })
        .from(loteSession)
        .innerJoin(dispositivo, eq(dispositivo.id, loteSession.dispositivoId))
        .where(and(isNull(loteSession.endTime), inArray(loteSession.loteId, loteIds)))
        .orderBy(desc(loteSession.startTime))
        .limit(10);

      const servicioNameMap = new Map(servicios.map((s) => [s.id, s.nombre]));

      activeSessions = sessionRows.map((r) => {
        const sId = loteToServicioMap.get(r.loteId) ?? "";
        return {
          loteId: r.loteId,
          servicioNombre: servicioNameMap.get(sId) ?? "",
          dispositivoNombre: r.dispositivoNombre,
          startTime: new Date(r.startTime).toISOString(),
        };
      });
    }
  }

  // 5. Get recent lotes
  let recentLotes: {
    loteId: string;
    servicioId: string;
    servicioNombre: string;
    totalCount: number;
    lastTs: string | null;
  }[] = [];

  if (servicioIds.length > 0) {
    const recentRows = await db
      .select({
        loteId: loteServicio.loteId,
        servicioId: loteServicio.servicioId,
        servicioNombre: servicio.nombre,
        totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
        lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
        createdAt: lote.createdAt,
      })
      .from(loteServicio)
      .innerJoin(lote, eq(lote.id, loteServicio.loteId))
      .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
      .leftJoin(loteStats, eq(loteStats.loteId, loteServicio.loteId))
      .where(inArray(loteServicio.servicioId, servicioIds))
      .groupBy(
        loteServicio.loteId,
        loteServicio.servicioId,
        servicio.nombre,
        lote.createdAt
      )
      .orderBy(desc(lote.createdAt))
      .limit(5);

    recentLotes = recentRows.map((r) => ({
      loteId: r.loteId,
      servicioId: r.servicioId,
      servicioNombre: r.servicioNombre,
      totalCount: r.totalCount,
      lastTs: r.lastTs ? new Date(r.lastTs).toISOString() : null,
    }));
  }

  return NextResponse.json({
    empresa: {
      nombre: empresaData.nombre,
      pais: empresaData.pais,
    },
    serviceTypeSummary,
    activeSessions,
    recentLotes,
  });
}
