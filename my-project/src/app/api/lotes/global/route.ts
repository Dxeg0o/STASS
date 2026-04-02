import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteStats,
  loteSession,
  servicio,
  variedad,
  producto,
  proceso,
  tipoProceso,
} from "@/db/schema";
import { eq, inArray, desc, sql, and, isNull, ilike, or } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const search = searchParams.get("search")?.trim();
  const variedadId = searchParams.get("variedadId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const offset = (page - 1) * limit;

  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  // Get all servicioIds for this empresa
  const servicios = await db
    .select({ id: servicio.id })
    .from(servicio)
    .where(eq(servicio.empresaId, empresaId));
  const servicioIds = servicios.map((s) => s.id);
  if (servicioIds.length === 0) {
    return NextResponse.json({ data: [], total: 0, page, limit });
  }

  // Get loteIds via loteServicio
  const loteLinks = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(inArray(loteServicio.servicioId, servicioIds));
  const uniqueLoteIds = [...new Set(loteLinks.map((l) => l.loteId))];
  if (uniqueLoteIds.length === 0) {
    return NextResponse.json({ data: [], total: 0, page, limit });
  }

  // Build conditions
  const conditions = [inArray(lote.id, uniqueLoteIds)];
  if (variedadId) {
    conditions.push(eq(lote.variedadId, variedadId));
  }
  // Search by codigoLote (primary) or UUID suffix
  if (search) {
    conditions.push(
      or(
        ilike(lote.codigoLote, `%${search}%`),
        sql`${lote.id}::text ilike ${"%" + search + "%"}`
      )!
    );
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  // Total count
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lote)
    .where(whereClause!);

  // Fetch lotes with variety, product, and aggregated stats
  const rows = await db
    .select({
      id: lote.id,
      codigoLote: lote.codigoLote,
      createdAt: lote.createdAt,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      variedadTipo: variedad.tipo,
      productoNombre: producto.nombre,
      totalBulbs: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
      lastTs: sql<string | null>`MAX(${loteStats.lastTs})`,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .leftJoin(loteStats, eq(loteStats.loteId, lote.id))
    .where(whereClause!)
    .groupBy(lote.id, lote.codigoLote, lote.createdAt, lote.variedadId, variedad.nombre, variedad.tipo, producto.nombre)
    .orderBy(desc(lote.createdAt))
    .limit(limit)
    .offset(offset);

  // Get active sessions for these lotes
  const loteIdsInPage = rows.map((r) => r.id);
  const activeSessions =
    loteIdsInPage.length > 0
      ? await db
          .select({
            loteId: loteSession.loteId,
          })
          .from(loteSession)
          .where(
            and(
              inArray(loteSession.loteId, loteIdsInPage),
              isNull(loteSession.endTime)
            )
          )
      : [];
  const activeSessionLoteIds = new Set(activeSessions.map((s) => s.loteId));

  // Get current stage (latest service assignment) for each lote
  const latestAssignments =
    loteIdsInPage.length > 0
      ? await db
          .select({
            loteId: loteServicio.loteId,
            servicioNombre: servicio.nombre,
            tipoProcesoNombre: tipoProceso.nombre,
          })
          .from(loteServicio)
          .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
          .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
          .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
          .where(inArray(loteServicio.loteId, loteIdsInPage))
          .orderBy(desc(loteServicio.asignadoAt))
      : [];

  // Group: take the latest assignment per lote
  const latestByLote = new Map<
    string,
    { servicioNombre: string; tipoProcesoNombre: string | null }
  >();
  for (const row of latestAssignments) {
    if (!latestByLote.has(row.loteId)) {
      latestByLote.set(row.loteId, {
        servicioNombre: row.servicioNombre,
        tipoProcesoNombre: row.tipoProcesoNombre,
      });
    }
  }

  const data = rows.map((r) => {
    const latest = latestByLote.get(r.id);
    return {
      id: r.id,
      codigoLote: r.codigoLote,
      createdAt: r.createdAt,
      variedadNombre: r.variedadNombre,
      variedadTipo: r.variedadTipo,
      productoNombre: r.productoNombre,
      totalBulbs: r.totalBulbs,
      lastTs: r.lastTs,
      isActive: activeSessionLoteIds.has(r.id),
      etapaActual: latest?.tipoProcesoNombre ?? null,
      servicioActual: latest?.servicioNombre ?? null,
    };
  });

  return NextResponse.json({ data, total, page, limit });
}
