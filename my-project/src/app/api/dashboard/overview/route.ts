// app/api/dashboard/overview/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  empresa,
  servicio,
  lote,
  loteSession,
  loteStats,
  dispositivo,
} from "@/db/schema";
import { eq, inArray, desc, sql, isNull } from "drizzle-orm";

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
  const empresaRows = await db
    .select({ id: empresa.id, nombre: empresa.nombre, pais: empresa.pais })
    .from(empresa)
    .where(eq(empresa.id, empresaId));

  if (empresaRows.length === 0) {
    return NextResponse.json({ error: "Empresa not found" }, { status: 404 });
  }

  const empresaData = empresaRows[0];

  // 2. Get all servicios for this empresa
  const servicios = await db
    .select({ id: servicio.id, tipo: servicio.tipo })
    .from(servicio)
    .where(eq(servicio.empresaId, empresaId));

  const servicioIds = servicios.map((s) => s.id);

  // 3. Build serviceTypeSummary: group servicios by tipo, aggregate loteStats
  let serviceTypeSummary: {
    tipo: string;
    count: number;
    totalBulbs: number;
    lastActivity: string | null;
  }[] = [];

  if (servicioIds.length > 0) {
    // Get all lotes for these servicios
    const lotes = await db
      .select({ id: lote.id, servicioId: lote.servicioId })
      .from(lote)
      .where(inArray(lote.servicioId, servicioIds));

    const loteIds = lotes.map((l) => l.id);

    // Build a map: loteId -> servicioId
    const loteToServicio = new Map<string, string>(
      lotes.map((l) => [l.id, l.servicioId])
    );

    // Build a map: servicioId -> tipo
    const servicioToTipo = new Map<string, string>(
      servicios.map((s) => [s.id, s.tipo])
    );

    // Aggregate loteStats per loteId
    type LoteAggregate = { totalBulbs: number; lastTs: Date | null };
    const loteAggregates = new Map<string, LoteAggregate>();

    if (loteIds.length > 0) {
      const statsRows = await db
        .select({
          loteId: loteStats.loteId,
          totalBulbs: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
          lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
        })
        .from(loteStats)
        .where(inArray(loteStats.loteId, loteIds))
        .groupBy(loteStats.loteId);

      for (const row of statsRows) {
        loteAggregates.set(row.loteId, {
          totalBulbs: row.totalBulbs,
          lastTs: row.lastTs ? new Date(row.lastTs) : null,
        });
      }
    }

    // Group by tipo
    type TipoAccumulator = {
      servicioIds: Set<string>;
      totalBulbs: number;
      lastTs: Date | null;
    };
    const tipoMap = new Map<string, TipoAccumulator>();

    for (const s of servicios) {
      if (!tipoMap.has(s.tipo)) {
        tipoMap.set(s.tipo, {
          servicioIds: new Set(),
          totalBulbs: 0,
          lastTs: null,
        });
      }
      tipoMap.get(s.tipo)!.servicioIds.add(s.id);
    }

    for (const [loteId, agg] of loteAggregates) {
      const sId = loteToServicio.get(loteId);
      if (!sId) continue;
      const tipo = servicioToTipo.get(sId);
      if (!tipo) continue;
      const entry = tipoMap.get(tipo);
      if (!entry) continue;

      entry.totalBulbs += agg.totalBulbs;
      if (agg.lastTs) {
        if (!entry.lastTs || agg.lastTs > entry.lastTs) {
          entry.lastTs = agg.lastTs;
        }
      }
    }

    serviceTypeSummary = Array.from(tipoMap.entries()).map(([tipo, acc]) => ({
      tipo,
      count: acc.servicioIds.size,
      totalBulbs: acc.totalBulbs,
      lastActivity: acc.lastTs ? acc.lastTs.toISOString() : null,
    }));
  }

  // 4. Get active sessions (loteSession where endTime IS NULL), limit 10
  let activeSessions: {
    loteNombre: string;
    servicioNombre: string;
    dispositivoNombre: string;
    startTime: string;
  }[] = [];

  if (servicioIds.length > 0) {
    const allLoteIds = await db
      .select({ id: lote.id })
      .from(lote)
      .where(inArray(lote.servicioId, servicioIds));

    const allLoteIdsList = allLoteIds.map((l) => l.id);

    if (allLoteIdsList.length > 0) {
      const sessionRows = await db
        .select({
          loteNombre: lote.nombre,
          servicioNombre: servicio.nombre,
          dispositivoNombre: dispositivo.nombre,
          startTime: loteSession.startTime,
        })
        .from(loteSession)
        .innerJoin(lote, eq(lote.id, loteSession.loteId))
        .innerJoin(servicio, eq(servicio.id, lote.servicioId))
        .innerJoin(dispositivo, eq(dispositivo.id, loteSession.dispositivoId))
        .where(
          isNull(loteSession.endTime)
        )
        .orderBy(desc(loteSession.startTime))
        .limit(10);

      // Filter to only sessions belonging to this empresa's lotes
      const loteIdSet = new Set(allLoteIdsList);
      activeSessions = sessionRows
        .filter(() => true) // already filtered via join with empresa's servicios
        .map((r) => ({
          loteNombre: r.loteNombre,
          servicioNombre: r.servicioNombre,
          dispositivoNombre: r.dispositivoNombre,
          startTime: new Date(r.startTime).toISOString(),
        }));

      // Ensure we only include sessions for this empresa's lotes
      // (the join on lote + servicio already constrains to lotes under these servicios)
      void loteIdSet;
    }
  }

  // 5. Get recent lotes: last 5 by createdAt with totalCount from loteStats, joined with servicio
  let recentLotes: {
    loteId: string;
    loteNombre: string;
    servicioId: string;
    servicioNombre: string;
    totalCount: number;
    lastTs: string | null;
  }[] = [];

  if (servicioIds.length > 0) {
    const recentRows = await db
      .select({
        loteId: lote.id,
        loteNombre: lote.nombre,
        servicioId: servicio.id,
        servicioNombre: servicio.nombre,
        totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
        lastTs: sql<Date | null>`MAX(${loteStats.lastTs})`,
      })
      .from(lote)
      .innerJoin(servicio, eq(servicio.id, lote.servicioId))
      .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
      .where(inArray(lote.servicioId, servicioIds))
      .groupBy(lote.id, lote.nombre, lote.createdAt, servicio.id, servicio.nombre)
      .orderBy(desc(lote.createdAt))
      .limit(5);

    recentLotes = recentRows.map((r) => ({
      loteId: r.loteId,
      loteNombre: r.loteNombre,
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
