import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  caja,
  cajaLoteSession,
  cajaStats,
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
  { params }: { params: Promise<{ servicioId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { servicioId } = await params;

    const [servicioRow] = await db
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
        ubicacionId: servicio.ubicacionId,
        ubicacionNombre: ubicacion.nombre,
        ubicacionTipo: ubicacion.tipo,
      })
      .from(servicio)
      .innerJoin(empresa, eq(empresa.id, servicio.empresaId))
      .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
      .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
      .leftJoin(producto, eq(producto.id, proceso.productoId))
      .leftJoin(ubicacion, eq(ubicacion.id, servicio.ubicacionId))
      .where(eq(servicio.id, servicioId))
      .limit(1);

    if (!servicioRow) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    const lotes = await db
      .select({
        loteId: lote.id,
        codigoLote: lote.codigoLote,
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
      .leftJoin(variedad, eq(variedad.id, lote.variedadId))
      .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
      .leftJoin(producto, eq(producto.id, variedad.productoId))
      .leftJoin(
        loteStats,
        and(eq(loteStats.loteId, lote.id), eq(loteStats.servicioId, servicioId))
      )
      .where(eq(loteServicio.servicioId, servicioId))
      .groupBy(
        lote.id,
        lote.codigoLote,
        loteServicio.asignadoAt,
        lote.createdAt,
        variedad.nombre,
        subvariedad.nombre,
        producto.nombre
      )
      .orderBy(desc(loteServicio.asignadoAt));

    const loteIds = lotes.map((l) => l.loteId);

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

    const deviceAssignments = await db
      .select({
        id: dispositivoServicio.id,
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
      .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
      .where(eq(dispositivoServicio.servicioId, servicioId))
      .orderBy(desc(dispositivoServicio.asignadoAt));

    const cajas =
      servicioRow.usaCajas && loteIds.length > 0
        ? await db
            .select({
              id: cajaLoteSession.id,
              cajaId: caja.id,
              codigo: caja.codigo,
              cajaActiva: caja.activa,
              loteSessionId: cajaLoteSession.loteSessionId,
              loteId: loteSession.loteId,
              codigoLote: lote.codigoLote,
              asignadoAt: cajaLoteSession.asignadoAt,
              retiradoAt: cajaLoteSession.retiradoAt,
              totalCount: sql<number>`COALESCE(SUM(${cajaStats.countIn} + ${cajaStats.countOut}), 0)::int`,
              lastCountAt: sql<Date | null>`MAX(${cajaStats.lastTs})`,
            })
            .from(cajaLoteSession)
            .innerJoin(caja, eq(caja.id, cajaLoteSession.cajaId))
            .innerJoin(loteSession, eq(loteSession.id, cajaLoteSession.loteSessionId))
            .innerJoin(lote, eq(lote.id, loteSession.loteId))
            .leftJoin(cajaStats, eq(cajaStats.cajaLoteSessionId, cajaLoteSession.id))
            .where(inArray(loteSession.loteId, loteIds))
            .groupBy(
              cajaLoteSession.id,
              caja.id,
              caja.codigo,
              caja.activa,
              cajaLoteSession.loteSessionId,
              loteSession.loteId,
              lote.codigoLote,
              cajaLoteSession.asignadoAt,
              cajaLoteSession.retiradoAt
            )
            .orderBy(desc(cajaLoteSession.asignadoAt))
        : [];
    const activeCajas = cajas.filter((item) => !item.retiradoAt);

    const activeLoteIds = new Set(activeSessions.map((session) => session.loteId));
    const totalCount = lotes.reduce((sum, item) => sum + item.totalCount, 0);
    const lastCountAt =
      lotes
        .map((item) => item.lastCountAt)
        .filter(Boolean)
        .sort((a, b) => toTime(b) - toTime(a))[0] ?? null;

    const summary = {
      loteCount: lotes.length,
      activeLoteCount: activeLoteIds.size,
      totalCount,
      lastCountAt,
      assignedDeviceCount: deviceAssignments.filter((a) => !a.fechaTermino).length,
      pendingDeviceCount: deviceAssignments.filter(
        (a) => !a.fechaInicio && !a.fechaTermino
      ).length,
      activeDeviceCount: deviceAssignments.filter(
        (a) => a.fechaInicio && !a.fechaTermino
      ).length,
      activeCajaCount: activeCajas.length,
    };

    return NextResponse.json({
      servicio: servicioRow,
      summary,
      lotes: lotes.map((l) => ({
        ...l,
        isActive: activeLoteIds.has(l.loteId),
      })),
      activeSessions,
      deviceAssignments,
      cajas: cajas.map((item) => ({
        ...item,
        isActive: !item.retiradoAt,
      })),
      activeCajas,
    });
  } catch (error) {
    console.error("Error fetching admin servicio detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
