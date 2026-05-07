import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  dispositivo,
  dispositivoServicio,
  empresa,
  lote,
  loteServicio,
  loteSession,
  loteStats,
  proceso,
  producto,
  servicio,
  subvariedad,
  tipoProceso,
  ubicacion,
  variedad,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";

function toTime(value: Date | string | null | undefined) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ procesoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { procesoId } = await params;

    const [procesoRow] = await db
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
        notas: proceso.notas,
        createdAt: proceso.createdAt,
      })
      .from(proceso)
      .innerJoin(empresa, eq(empresa.id, proceso.empresaId))
      .innerJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
      .leftJoin(producto, eq(producto.id, proceso.productoId))
      .where(eq(proceso.id, procesoId))
      .limit(1);

    if (!procesoRow) {
      return NextResponse.json(
        { error: "Proceso no encontrado" },
        { status: 404 }
      );
    }

    const servicios = await db
      .select({
        id: servicio.id,
        nombre: servicio.nombre,
        tipo: servicio.tipo,
        estado: servicio.estado,
        usaCajas: servicio.usaCajas,
        fechaInicio: servicio.fechaInicio,
        fechaFin: servicio.fechaFin,
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
      .leftJoin(ubicacion, eq(ubicacion.id, servicio.ubicacionId))
      .where(eq(servicio.procesoId, procesoId))
      .orderBy(sql`${servicio.fechaInicio} DESC NULLS LAST, ${servicio.nombre} ASC`);

    const servicioIds = servicios.map((s) => s.id);

    const lotes =
      servicioIds.length > 0
        ? await db
            .select({
              loteId: lote.id,
              codigoLote: lote.codigoLote,
              servicioId: loteServicio.servicioId,
              servicioNombre: servicio.nombre,
              asignadoAt: loteServicio.asignadoAt,
              createdAt: lote.createdAt,
              variedadNombre: variedad.nombre,
              subvariedadNombre: subvariedad.nombre,
              productoNombre: producto.nombre,
              totalCount: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
              lastCountAt: sql<Date | null>`MAX(${loteStats.lastTs})`,
            })
            .from(loteServicio)
            .innerJoin(lote, eq(lote.id, loteServicio.loteId))
            .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
            .leftJoin(variedad, eq(variedad.id, lote.variedadId))
            .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
            .leftJoin(producto, eq(producto.id, variedad.productoId))
            .leftJoin(
              loteStats,
              and(
                eq(loteStats.loteId, lote.id),
                eq(loteStats.servicioId, loteServicio.servicioId)
              )
            )
            .where(inArray(loteServicio.servicioId, servicioIds))
            .groupBy(
              lote.id,
              lote.codigoLote,
              loteServicio.servicioId,
              servicio.nombre,
              loteServicio.asignadoAt,
              lote.createdAt,
              variedad.nombre,
              subvariedad.nombre,
              producto.nombre
            )
            .orderBy(desc(loteServicio.asignadoAt))
        : [];

    const loteIds = [...new Set(lotes.map((l) => l.loteId))];

    const activeSessions =
      loteIds.length > 0
        ? await db
            .select({
              sessionId: loteSession.id,
              loteId: loteSession.loteId,
              codigoLote: lote.codigoLote,
              dispositivoId: loteSession.dispositivoId,
              dispositivoNombre: dispositivo.nombre,
              startTime: loteSession.startTime,
            })
            .from(loteSession)
            .innerJoin(lote, eq(lote.id, loteSession.loteId))
            .innerJoin(dispositivo, eq(dispositivo.id, loteSession.dispositivoId))
            .where(
              and(
                inArray(loteSession.loteId, loteIds),
                isNull(loteSession.endTime)
              )
            )
            .orderBy(desc(loteSession.startTime))
        : [];

    const deviceAssignments =
      servicioIds.length > 0
        ? await db
            .select({
              id: dispositivoServicio.id,
              servicioId: dispositivoServicio.servicioId,
              servicioNombre: servicio.nombre,
              dispositivoId: dispositivo.id,
              dispositivoNombre: dispositivo.nombre,
              dispositivoTipo: dispositivo.tipo,
              dispositivoActivo: dispositivo.activo,
              maquina: dispositivoServicio.maquina,
              asignadoAt: dispositivoServicio.asignadoAt,
              fechaInicio: dispositivoServicio.fechaInicio,
              fechaTermino: dispositivoServicio.fechaTermino,
            })
            .from(dispositivoServicio)
            .innerJoin(servicio, eq(servicio.id, dispositivoServicio.servicioId))
            .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
            .where(inArray(dispositivoServicio.servicioId, servicioIds))
            .orderBy(desc(dispositivoServicio.asignadoAt))
        : [];

    const activeLoteIds = new Set(activeSessions.map((s) => s.loteId));
    const serviceStateCounts = servicios.reduce(
      (acc, item) => {
        acc[item.estado] = (acc[item.estado] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const summary = {
      servicioCount: servicios.length,
      serviciosPlanificados: serviceStateCounts.planificado ?? 0,
      serviciosEnCurso: serviceStateCounts.en_curso ?? 0,
      serviciosCompletados: serviceStateCounts.completado ?? 0,
      serviciosCancelados: serviceStateCounts.cancelado ?? 0,
      loteCount: loteIds.length,
      activeLoteCount: activeLoteIds.size,
      pendingDeviceCount: deviceAssignments.filter(
        (a) => !a.fechaInicio && !a.fechaTermino
      ).length,
      activeDeviceCount: deviceAssignments.filter(
        (a) => a.fechaInicio && !a.fechaTermino
      ).length,
      totalCount: servicios.reduce((sum, item) => sum + item.totalCount, 0),
      lastCountAt:
        servicios
          .map((item) => item.lastCountAt)
          .filter(Boolean)
          .sort((a, b) => toTime(b) - toTime(a))[0] ?? null,
    };

    return NextResponse.json({
      proceso: procesoRow,
      summary,
      servicios,
      lotes: lotes.map((l) => ({
        ...l,
        isActive: activeLoteIds.has(l.loteId),
      })),
      activeSessions,
      deviceAssignments,
    });
  } catch (error) {
    console.error("Error fetching admin proceso detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
