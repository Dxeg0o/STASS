import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  cajaLoteSession,
  dispositivoServicio,
  empresa,
  loteServicio,
  loteSession,
  loteStats,
  proceso,
  producto,
  servicio,
  tipoProceso,
  ubicacion,
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
    const tipo = searchParams.get("tipo");
    const procesoId = searchParams.get("procesoId");

    const conditions = [];
    if (empresaId) conditions.push(eq(servicio.empresaId, empresaId));
    if (estado) conditions.push(eq(servicio.estado, estado));
    if (tipo) conditions.push(eq(servicio.tipo, tipo));
    if (procesoId) conditions.push(eq(servicio.procesoId, procesoId));

    const servicios = await db
      .select({
        id: servicio.id,
        nombre: servicio.nombre,
        tipo: servicio.tipo,
        estado: servicio.estado,
        usaCajas: servicio.usaCajas,
        fechaInicio: servicio.fechaInicio,
        fechaFin: servicio.fechaFin,
        empresaId: servicio.empresaId,
        empresaNombre: empresa.nombre,
        procesoId: servicio.procesoId,
        procesoEstado: proceso.estado,
        procesoTemporada: proceso.temporada,
        tipoProcesoNombre: tipoProceso.nombre,
        productoNombre: producto.nombre,
        ubicacionNombre: ubicacion.nombre,
        ubicacionTipo: ubicacion.tipo,
        loteCount: sql<number>`(
          SELECT COUNT(DISTINCT ls.lote_id)::int
          FROM ${loteServicio} ls
          WHERE ls.servicio_id = ${servicio.id}
        )`,
        activeLoteCount: sql<number>`(
          SELECT COUNT(DISTINCT sess.lote_id)::int
          FROM ${loteSession} sess
          INNER JOIN ${loteServicio} ls ON ls.lote_id = sess.lote_id
          WHERE ls.servicio_id = ${servicio.id}
            AND sess.end_time IS NULL
        )`,
        assignedDeviceCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${dispositivoServicio} ds
          WHERE ds.servicio_id = ${servicio.id}
            AND ds.fecha_termino IS NULL
        )`,
        pendingDeviceCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${dispositivoServicio} ds
          WHERE ds.servicio_id = ${servicio.id}
            AND ds.fecha_inicio IS NULL
            AND ds.fecha_termino IS NULL
        )`,
        activeDeviceCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${dispositivoServicio} ds
          WHERE ds.servicio_id = ${servicio.id}
            AND ds.fecha_inicio IS NOT NULL
            AND ds.fecha_termino IS NULL
        )`,
        activeCajaCount: sql<number>`(
          SELECT COUNT(DISTINCT cls.id)::int
          FROM ${cajaLoteSession} cls
          INNER JOIN ${loteSession} sess ON sess.id = cls.lote_session_id
          INNER JOIN ${loteServicio} ls ON ls.lote_id = sess.lote_id
          WHERE ls.servicio_id = ${servicio.id}
            AND cls.retirado_at IS NULL
        )`,
        totalCount: sql<number>`(
          SELECT COALESCE(SUM(lst.count_in + lst.count_out), 0)::int
          FROM ${loteStats} lst
          WHERE lst.servicio_id = ${servicio.id}
        )`,
        lastCountAt: sql<Date | null>`(
          SELECT MAX(lst.last_ts)
          FROM ${loteStats} lst
          WHERE lst.servicio_id = ${servicio.id}
        )`,
      })
      .from(servicio)
      .innerJoin(empresa, eq(empresa.id, servicio.empresaId))
      .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
      .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
      .leftJoin(producto, eq(producto.id, proceso.productoId))
      .leftJoin(ubicacion, eq(ubicacion.id, servicio.ubicacionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${servicio.fechaInicio} DESC NULLS LAST, ${servicio.nombre} ASC`);

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error fetching servicios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
