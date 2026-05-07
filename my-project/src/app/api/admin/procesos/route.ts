import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dispositivoServicio,
  empresa,
  loteServicio,
  loteSession,
  loteStats,
  proceso,
  producto,
  servicio,
  tipoProceso,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId");
    const estado = searchParams.get("estado");
    const tipoProcesoId = searchParams.get("tipoProcesoId");
    const productoId = searchParams.get("productoId");
    const temporada = searchParams.get("temporada");

    const conditions = [];
    if (empresaId) conditions.push(eq(proceso.empresaId, empresaId));
    if (estado) conditions.push(eq(proceso.estado, estado));
    if (tipoProcesoId) conditions.push(eq(proceso.tipoProcesoId, tipoProcesoId));
    if (productoId) conditions.push(eq(proceso.productoId, productoId));
    if (temporada) conditions.push(eq(proceso.temporada, temporada));

    const procesos = await db
      .select({
        id: proceso.id,
        empresaId: proceso.empresaId,
        empresaNombre: empresa.nombre,
        tipoProcesoId: proceso.tipoProcesoId,
        tipoProcesoNombre: tipoProceso.nombre,
        productoId: proceso.productoId,
        productoNombre: producto.nombre,
        temporada: proceso.temporada,
        estado: proceso.estado,
        fechaInicio: proceso.fechaInicio,
        fechaFin: proceso.fechaFin,
        createdAt: proceso.createdAt,
        servicioCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${servicio} s
          WHERE s.proceso_id = ${proceso.id}
        )`,
        serviciosPlanificados: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${servicio} s
          WHERE s.proceso_id = ${proceso.id} AND s.estado = 'planificado'
        )`,
        serviciosEnCurso: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${servicio} s
          WHERE s.proceso_id = ${proceso.id} AND s.estado = 'en_curso'
        )`,
        serviciosCompletados: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${servicio} s
          WHERE s.proceso_id = ${proceso.id} AND s.estado = 'completado'
        )`,
        serviciosCancelados: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${servicio} s
          WHERE s.proceso_id = ${proceso.id} AND s.estado = 'cancelado'
        )`,
        loteCount: sql<number>`(
          SELECT COUNT(DISTINCT ls.lote_id)::int
          FROM ${loteServicio} ls
          INNER JOIN ${servicio} s ON s.id = ls.servicio_id
          WHERE s.proceso_id = ${proceso.id}
        )`,
        activeLoteCount: sql<number>`(
          SELECT COUNT(DISTINCT sess.lote_id)::int
          FROM ${loteSession} sess
          INNER JOIN ${loteServicio} ls ON ls.lote_id = sess.lote_id
          INNER JOIN ${servicio} s ON s.id = ls.servicio_id
          WHERE s.proceso_id = ${proceso.id}
            AND sess.end_time IS NULL
        )`,
        pendingDeviceCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${dispositivoServicio} ds
          INNER JOIN ${servicio} s ON s.id = ds.servicio_id
          WHERE s.proceso_id = ${proceso.id}
            AND ds.fecha_inicio IS NULL
            AND ds.fecha_termino IS NULL
        )`,
        activeDeviceCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${dispositivoServicio} ds
          INNER JOIN ${servicio} s ON s.id = ds.servicio_id
          WHERE s.proceso_id = ${proceso.id}
            AND ds.fecha_inicio IS NOT NULL
            AND ds.fecha_termino IS NULL
        )`,
        totalCount: sql<number>`(
          SELECT COALESCE(SUM(lst.count_in + lst.count_out), 0)::int
          FROM ${loteStats} lst
          INNER JOIN ${servicio} s ON s.id = lst.servicio_id
          WHERE s.proceso_id = ${proceso.id}
        )`,
        lastCountAt: sql<Date | null>`(
          SELECT MAX(lst.last_ts)
          FROM ${loteStats} lst
          INNER JOIN ${servicio} s ON s.id = lst.servicio_id
          WHERE s.proceso_id = ${proceso.id}
        )`,
      })
      .from(proceso)
      .innerJoin(empresa, eq(empresa.id, proceso.empresaId))
      .innerJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
      .leftJoin(producto, eq(producto.id, proceso.productoId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${proceso.createdAt} DESC`);

    return NextResponse.json(procesos);
  } catch (error) {
    console.error("Error fetching admin procesos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
