import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteSession,
  loteTotalStats,
  servicio,
  variedad,
  subvariedad,
  producto,
  proceso,
  tipoProceso,
  dispositivo,
  dispositivoServicio,
  loteCierreCalibreBin,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, sql, inArray } from "drizzle-orm";

// El calibre puede venir con un extremo abierto (merma: "<6", ">10"), así que
// calibreFrom/calibreTo son nullable y hay que formatear los tres casos.
function formatCalibre(from: number | null, to: number | null): string | null {
  if (from != null && to != null) return `${from}/${to}`;
  if (from != null) return `${from}+`;
  if (to != null) return `≤${to}`;
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const { loteId } = await params;

  // 1. Fetch lote basic info
  const loteRow = await db
    .select({
      id: lote.id,
      codigoLote: lote.codigoLote,
      createdAt: lote.createdAt,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      variedadTipo: variedad.tipo,
      subvariedadNombre: subvariedad.nombre,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
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
      servicioId: loteTotalStats.servicioId,
      totalIn: sql<number>`SUM(${loteTotalStats.countIn})::int`,
      totalOut: sql<number>`SUM(${loteTotalStats.countOut})::int`,
      firstTs: sql<string | null>`MIN(${loteTotalStats.firstTs})`,
      lastTs: sql<string | null>`MAX(${loteTotalStats.lastTs})`,
    })
    .from(loteTotalStats)
    .where(eq(loteTotalStats.loteId, loteId))
    .groupBy(loteTotalStats.servicioId);

  const statsMap = new Map(statsPerService.map((s) => [s.servicioId, s]));

  // 5. Total aggregated stats
  const totalStats = await db
    .select({
      totalIn: sql<number>`COALESCE(SUM(${loteTotalStats.countIn}), 0)::int`,
      totalOut: sql<number>`COALESCE(SUM(${loteTotalStats.countOut}), 0)::int`,
    })
    .from(loteTotalStats)
    .where(eq(loteTotalStats.loteId, loteId));

  // 6. Device breakdown
  const deviceStats = await db
    .select({
      dispositivoId: loteTotalStats.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      totalIn: sql<number>`SUM(${loteTotalStats.countIn})::int`,
      totalOut: sql<number>`SUM(${loteTotalStats.countOut})::int`,
      lastTs: sql<string | null>`MAX(${loteTotalStats.lastTs})`,
    })
    .from(loteTotalStats)
    .innerJoin(dispositivo, eq(dispositivo.id, loteTotalStats.dispositivoId))
    .where(eq(loteTotalStats.loteId, loteId))
    .groupBy(loteTotalStats.dispositivoId, dispositivo.nombre);

  // 7. Check if any service uses cajas
  const servicioIds = lifecycle.map((l) => l.servicioId);

  // 7b. Salida física de cada dispositivo y el calibre que declaró en ESTE lote.
  //
  // La salida vive en dispositivo_servicio (configurable por servicio, no es una
  // propiedad del equipo), y el calibre en lote_cierre_calibre_bin — lo escribe
  // la tablet al cerrar el lote. Por eso el calibre se resuelve por lote y no
  // se puede cachear como atributo de la salida: la misma salida corre calibres
  // distintos en lotes distintos.
  const dispositivoIds = [...new Set(deviceStats.map((d) => d.dispositivoId))];

  // Pares (dispositivo, servicio) que realmente tienen conteos en este lote.
  // Es imprescindible acotar por el par y no solo por dispositivo: un equipo
  // suele estar vinculado a varios servicios, y solo en algunos tiene salida
  // configurada. Filtrando solo por dispositivo, la "Salida 2" de un servicio
  // se filtraba a lotes de otro servicio que no usa salidas.
  const paresConConteo = await db
    .selectDistinct({
      servicioId: loteTotalStats.servicioId,
      dispositivoId: loteTotalStats.dispositivoId,
    })
    .from(loteTotalStats)
    .where(eq(loteTotalStats.loteId, loteId));

  const paresValidos = new Set(
    paresConConteo.map((p) => `${p.dispositivoId}|${p.servicioId}`)
  );

  const salidaRows =
    dispositivoIds.length > 0 && servicioIds.length > 0
      ? await db
          .select({
            dispositivoId: dispositivoServicio.dispositivoId,
            servicioId: dispositivoServicio.servicioId,
            salidaOrden: dispositivoServicio.salidaOrden,
            salidaNombre: dispositivoServicio.salidaNombre,
          })
          .from(dispositivoServicio)
          .where(
            and(
              inArray(dispositivoServicio.dispositivoId, dispositivoIds),
              inArray(dispositivoServicio.servicioId, servicioIds)
            )
          )
      : [];

  // Un mismo dispositivo puede tener conteos en más de un servicio del lote
  // (raro: 1 de 270 casos en datos reales). Nos quedamos con el vínculo que sí
  // tiene salida configurada, y ante empate con la de menor orden, para que la
  // etiqueta sea estable entre recargas.
  const salidaPorDispositivo = new Map<
    string,
    { salidaOrden: number | null; salidaNombre: string | null }
  >();
  for (const row of salidaRows) {
    if (!paresValidos.has(`${row.dispositivoId}|${row.servicioId}`)) continue;
    const actual = salidaPorDispositivo.get(row.dispositivoId);
    if (
      !actual ||
      (actual.salidaOrden == null && row.salidaOrden != null) ||
      (actual.salidaOrden != null &&
        row.salidaOrden != null &&
        row.salidaOrden < actual.salidaOrden)
    ) {
      salidaPorDispositivo.set(row.dispositivoId, {
        salidaOrden: row.salidaOrden,
        salidaNombre: row.salidaNombre,
      });
    }
  }

  // Calibre declarado por salida en este lote. En los datos reales hay siempre
  // una sola fila por (lote, dispositivo), pero el modelo admite varios tramos
  // con vigencia temporal (recalibración a mitad de lote), así que se agrupa por
  // rango en vez de asumir fila única.
  const calibreRows =
    dispositivoIds.length > 0
      ? await db
          .select({
            dispositivoId: loteCierreCalibreBin.dispositivoId,
            servicioId: loteCierreCalibreBin.servicioId,
            calibreFrom: loteCierreCalibreBin.calibreFrom,
            calibreTo: loteCierreCalibreBin.calibreTo,
          })
          .from(loteCierreCalibreBin)
          .where(
            and(
              eq(loteCierreCalibreBin.loteId, loteId),
              isNotNull(loteCierreCalibreBin.dispositivoId),
              inArray(loteCierreCalibreBin.dispositivoId, dispositivoIds)
            )
          )
          .groupBy(
            loteCierreCalibreBin.dispositivoId,
            loteCierreCalibreBin.servicioId,
            loteCierreCalibreBin.calibreFrom,
            loteCierreCalibreBin.calibreTo
          )
          .orderBy(
            loteCierreCalibreBin.calibreFrom,
            loteCierreCalibreBin.calibreTo
          )
      : [];

  const calibresPorDispositivo = new Map<string, string[]>();
  for (const row of calibreRows) {
    if (!row.dispositivoId) continue;
    // Mismo criterio que la salida: solo el servicio donde el equipo contó.
    if (!paresValidos.has(`${row.dispositivoId}|${row.servicioId}`)) continue;
    const etiqueta = formatCalibre(row.calibreFrom, row.calibreTo);
    if (!etiqueta) continue;
    const acc = calibresPorDispositivo.get(row.dispositivoId);
    if (acc) {
      if (!acc.includes(etiqueta)) acc.push(etiqueta);
    } else {
      calibresPorDispositivo.set(row.dispositivoId, [etiqueta]);
    }
  }

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
    codigoLote: loteInfo.codigoLote,
    createdAt: loteInfo.createdAt,
    variedadNombre: loteInfo.variedadNombre,
    variedadTipo: loteInfo.variedadTipo,
    subvariedadNombre: loteInfo.subvariedadNombre,
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
    // Ordenado por salida (nulls al final) igual que /api/app/dispositivos, así
    // la tabla web y la tablet listan las salidas en el mismo orden.
    devices: deviceStats
      .map((d) => {
        const salida = salidaPorDispositivo.get(d.dispositivoId);
        return {
          dispositivoNombre: d.dispositivoNombre,
          salidaOrden: salida?.salidaOrden ?? null,
          // Misma convención que /api/app/lotes/resumen-calibres: si el servicio
          // no tiene salidas configuradas, se cae al nombre del equipo.
          salidaLabel: salida?.salidaNombre ?? d.dispositivoNombre,
          calibres: calibresPorDispositivo.get(d.dispositivoId) ?? [],
          totalIn: d.totalIn,
          totalOut: d.totalOut,
          lastTs: d.lastTs,
        };
      })
      .sort((a, b) => {
        if (a.salidaOrden != null && b.salidaOrden != null) {
          return a.salidaOrden - b.salidaOrden;
        }
        if (a.salidaOrden != null) return -1;
        if (b.salidaOrden != null) return 1;
        return a.dispositivoNombre.localeCompare(b.dispositivoNombre, "es");
      }),
    hasCajas,
  });
}
