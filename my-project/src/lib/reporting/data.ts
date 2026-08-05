import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conteo,
  dispositivo,
  dispositivoServicio,
  empresa,
  lote,
  loteCierreCalibreBin,
  loteCalibreDeclaradoDia,
  loteServicio,
  loteStats,
  loteTotalStats,
  proceso,
  servicio,
  tipoProceso,
} from "@/db/schema";
import type {
  ReportCalibreRow,
  ReportKind,
  ReportLote,
  ReportSalidaRow,
  ServiceReport,
} from "./types";

const REPORT_TIME_ZONE = "America/Santiago";
const REPORT_TIME_ZONE_SQL = sql.raw(`'${REPORT_TIME_ZONE}'`);

type ManualRange = {
  from: number;
  to: number;
  bins: number;
};

type CountRow = {
  loteId: string;
  perimeter: number | null;
  bulbs: number;
};

type LoteBucket = {
  key: string;
  label: string;
  bulbs: number;
  bins: number;
};

function roundedPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
}

function calibreOrder(label: string) {
  if (label.startsWith("Menor a")) return -1;
  if (label.startsWith("Mayor a")) return Number.POSITIVE_INFINITY;
  if (label.startsWith("Sin calibre") || label.startsWith("Sin rango manual")) return 1000000;
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 1000000;
}

function sortCalibreRows<T extends { label: string }>(left: T, right: T) {
  return calibreOrder(left.label) - calibreOrder(right.label) || left.label.localeCompare(right.label, "es");
}

function dateParts(date: Date, timeZone = REPORT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: values.year, month: values.month, day: values.day };
}

export function formatLocalDate(date: Date = new Date()) {
  const { year, month, day } = dateParts(date);
  return `${year}-${month}-${day}`;
}

export function shiftLocalDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateUtc(value);
}

/**
 * Fechas que debe reportar el job automatico.
 *
 * El envio es al cierre del turno, asi que la fecha reportada es el dia en
 * curso: el viernes a las 18:10 sale el informe del viernes. Sabado y domingo
 * no se envia, y el lunes se ponen al dia sabado y domingo antes del propio
 * lunes, en orden cronologico.
 */
export function automaticReportDates(now: Date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    weekday: "long",
  }).format(now);
  if (weekday === "Saturday" || weekday === "Sunday") return [];

  const today = formatLocalDate(now);
  const offsets = weekday === "Monday" ? [-2, -1, 0] : [0];
  return offsets.map((offset) => shiftLocalDate(today, offset));
}

function formatDateUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Rango [inicio, fin) en timestamptz para un dia local.
 *
 * Es deliberadamente un rango y no `(ts AT TIME ZONE ...)::date = fecha`: esa
 * forma no es sargable y el planner descarta idx_conteo_servicio (servicio_id,
 * ts), cayendo en un seq scan de la tabla completa — 62M filas / 16 GB, mas de
 * 55 s. Con el rango se resuelve por indice en milisegundos. El casteo lo hace
 * Postgres, asi que el cambio de horario de Chile queda resuelto en la base.
 */
export function localDayRange(reportDate: string) {
  return {
    from: sql`(${reportDate}::date)::timestamp at time zone ${REPORT_TIME_ZONE_SQL}`,
    to: sql`(${reportDate}::date + 1)::timestamp at time zone ${REPORT_TIME_ZONE_SQL}`,
  };
}

function bucketFor(
  perimeter: number | null,
  ranges: ManualRange[]
): { key: string; label: string; bins: number } {
  if (perimeter == null || !Number.isFinite(perimeter)) {
    return { key: "sin-calibre", label: "Sin calibre / No size", bins: 0 };
  }

  if (ranges.length === 0) {
    const from = Math.floor(perimeter);
    const to = from + 1;
    return {
      key: `automatico:${from}:${to}`,
      label: `Calibre / Size ${from}-${to} cm`,
      bins: 0,
    };
  }

  const matching = ranges.find((range) => perimeter >= range.from && perimeter < range.to);
  if (matching) {
    return {
      key: `manual:${matching.from}:${matching.to}`,
      label: `Calibre / Size ${matching.from}-${matching.to} cm`,
      bins: matching.bins,
    };
  }

  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  if (perimeter < first.from) {
    return {
      key: "manual-menor",
      label: `Menor a / Below ${first.from} cm`,
      bins: 0,
    };
  }
  if (perimeter >= last.to) {
    return {
      key: "manual-mayor",
      label: `Mayor a / Above ${last.to} cm`,
      bins: 0,
    };
  }

  return { key: "manual-sin-rango", label: "Sin rango manual / No manual range", bins: 0 };
}

function buildLote(
  row: CountRow,
  rows: CountRow[],
  codigoLote: string,
  ranges: ManualRange[]
): ReportLote {
  const buckets = new Map<string, LoteBucket>();
  for (const item of rows) {
    const bucket = bucketFor(item.perimeter, ranges);
    const existing = buckets.get(bucket.key);
    if (existing) {
      existing.bulbs += item.bulbs;
    } else {
      buckets.set(bucket.key, {
        key: bucket.key,
        label: bucket.label,
        bulbs: item.bulbs,
        bins: bucket.bins,
      });
    }
  }

  const bulbs = rows.reduce((sum, item) => sum + item.bulbs, 0);
  return {
    loteId: row.loteId,
    codigoLote,
    bulbs,
    percent: 0,
    // Modo medido: el calibre sale del perimetro, no hay salida que declare.
    mermaBulbs: 0,
    rows: [...buckets.values()]
      .sort(sortCalibreRows)
      .map((bucket) => ({
        ...bucket,
        percent: roundedPercent(bucket.bulbs, bulbs),
        // En modo medido el calibre viene del perímetro, no de lo que declara
        // una salida, así que no hay desglose que mostrar.
        salidas: [],
      })),
  };
}

/** Ordena las salidas y calcula su peso dentro del calibre al que pertenecen. */
function finishSalidas(salidas: ReportSalidaRow[], bulbsDelCalibre: number) {
  return [...salidas]
    .sort(
      (left, right) =>
        (left.salidaOrden ?? Number.POSITIVE_INFINITY) -
          (right.salidaOrden ?? Number.POSITIVE_INFINITY) ||
        left.label.localeCompare(right.label, "es")
    )
    .map((salida) => ({
      ...salida,
      percent: roundedPercent(salida.bulbs, bulbsDelCalibre),
    }));
}

function mergeServiceRows(lotes: ReportLote[]) {
  const buckets = new Map<string, ReportCalibreRow>();
  for (const current of lotes) {
    for (const row of current.rows) {
      const existing = buckets.get(row.key);
      if (existing) {
        existing.bulbs += row.bulbs;
        existing.bins += row.bins;
        // Las salidas también se suman entre lotes: en el resumen del servicio
        // "Salida 2" es el aporte de esa salida a ese calibre en todos los lotes.
        for (const salida of row.salidas) {
          const previa = existing.salidas.find(
            (s) => s.dispositivoNombre === salida.dispositivoNombre
          );
          if (previa) previa.bulbs += salida.bulbs;
          else existing.salidas.push({ ...salida });
        }
      } else {
        buckets.set(row.key, {
          ...row,
          salidas: row.salidas.map((salida) => ({ ...salida })),
        });
      }
    }
  }
  const total = lotes.reduce((sum, current) => sum + current.bulbs, 0);
  return [...buckets.values()]
    .sort(sortCalibreRows)
    .map((row) => ({
      ...row,
      percent: roundedPercent(row.bulbs, total),
      salidas: finishSalidas(row.salidas, row.bulbs),
    }));
}

function declaredLabel(from: number | null, to: number | null, sinDeclarar: boolean) {
  if (sinDeclarar) return "Sin declarar / Undeclared";
  if (from === null && to !== null) return `Menor a / Below ${to} cm`;
  if (from !== null && to === null) return `Mayor a / Above ${from} cm`;
  return `Calibre / Size ${from}-${to} cm`;
}

async function buildDeclaredServiceReport(metadata: { serviceName: string; companyName: string; processName: string | null }, serviceId: string, loteIds: string[], kind: ReportKind, reportDate: string): Promise<ServiceReport> {
  const conditions = [eq(loteCalibreDeclaradoDia.servicioId, serviceId), inArray(loteCalibreDeclaradoDia.loteId, loteIds)];
  if (kind === "daily") conditions.push(eq(loteCalibreDeclaradoDia.dia, reportDate));
  const summary = await db.select().from(loteCalibreDeclaradoDia).where(and(...conditions));
  const usedLoteIds = [...new Set(summary.map((row) => row.loteId))];
  if (usedLoteIds.length === 0) return { kind, serviceId, serviceName: metadata.serviceName, companyName: metadata.companyName, processName: metadata.processName, reportDate, generatedAt: new Date().toISOString(), calibreSource: "declarado", totalBulbs: 0, rows: [], lotes: [], mermaBulbs: 0 };
  const names = await db.select({ id: lote.id, codigo: lote.codigoLote }).from(lote).where(inArray(lote.id, usedLoteIds));
  const nameMap = new Map(names.map((row) => [row.id, row.codigo ?? row.id.slice(0, 8)]));
  const declarations = await db.select({ loteId: loteCierreCalibreBin.loteId, dispositivoId: loteCierreCalibreBin.dispositivoId, from: loteCierreCalibreBin.calibreFrom, to: loteCierreCalibreBin.calibreTo, bins: loteCierreCalibreBin.bins }).from(loteCierreCalibreBin).where(and(eq(loteCierreCalibreBin.servicioId, serviceId), inArray(loteCierreCalibreBin.loteId, usedLoteIds), isNotNull(loteCierreCalibreBin.dispositivoId)));
  const bins = new Map<string, number>();
  for (const row of declarations) { const key = `${row.loteId}:${row.from ?? ""}:${row.to ?? ""}`; bins.set(key, (bins.get(key) ?? 0) + (Number(row.bins) || 0)); }
  // Etiqueta de cada salida del servicio. Se resuelve una vez y no por fila:
  // la salida es configuración del servicio, no del lote ni del día.
  const salidaRows = await db
    .select({
      dispositivoId: dispositivoServicio.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(eq(dispositivoServicio.servicioId, serviceId));
  const salidaPorDispositivo = new Map(
    salidaRows.map((row) => [
      row.dispositivoId,
      {
        salidaOrden: row.salidaOrden,
        // Misma convención que el resto: sin salida configurada se cae al
        // nombre del equipo en vez de mostrar un hueco.
        label: row.salidaNombre ?? row.dispositivoNombre,
        dispositivoNombre: row.dispositivoNombre,
      },
    ])
  );

  // Que salidas declararon algo en cada lote. Es el criterio que separa la merma
  // del producto pendiente dentro del balde "sin declarar": una salida que nunca
  // declaro en el lote saco merma; una que si declaro y tiene unidades fuera de
  // sus rangos es producto que todavia no se declara. Mismo criterio que usa la
  // tabla del lote (ver @/lib/salida-calibre).
  const declaroEnLote = new Set(
    declarations.map((row) => `${row.loteId}|${row.dispositivoId}`)
  );

  const mermaPorLote = new Map<string, number>();
  const byLote = new Map<string, Map<string, ReportCalibreRow>>();
  for (const row of summary) {
    if (row.sinDeclarar && !declaroEnLote.has(`${row.loteId}|${row.dispositivoId}`)) {
      const unidades = Number(row.unidades) || 0;
      mermaPorLote.set(row.loteId, (mermaPorLote.get(row.loteId) ?? 0) + unidades);
      continue;
    }
    const key = row.sinDeclarar ? "sin_declarar" : `${row.calibreFrom ?? ""}:${row.calibreTo ?? ""}`;
    const rows = byLote.get(row.loteId) ?? new Map<string, ReportCalibreRow>();
    const current = rows.get(key) ?? { key, label: declaredLabel(row.calibreFrom, row.calibreTo, row.sinDeclarar), bulbs: 0, bins: row.sinDeclarar ? 0 : bins.get(`${row.loteId}:${row.calibreFrom ?? ""}:${row.calibreTo ?? ""}`) ?? 0, percent: 0, salidas: [] };
    current.bulbs += Number(row.unidades) || 0;
    // El resumen ya viene por (dia, lote, servicio, dispositivo, calibre), así
    // que cada fila es el aporte de una salida a este rango de calibre. En el
    // reporte total hay varias filas por salida (una por día) y se acumulan.
    const unidades = Number(row.unidades) || 0;
    const salida = salidaPorDispositivo.get(row.dispositivoId);
    const existente = current.salidas.find((s) => s.dispositivoNombre === (salida?.dispositivoNombre ?? row.dispositivoId));
    if (existente) {
      existente.bulbs += unidades;
    } else {
      current.salidas.push({
        salidaOrden: salida?.salidaOrden ?? null,
        label: salida?.label ?? row.dispositivoId.slice(0, 8),
        dispositivoNombre: salida?.dispositivoNombre ?? row.dispositivoId.slice(0, 8),
        bulbs: unidades,
        percent: 0,
      });
    }
    rows.set(key, current); byLote.set(row.loteId, rows);
  }
  // Un lote puede tener SOLO merma (nada declarado que mostrar), asi que se
  // recorren las claves de los dos mapas y no solo las de byLote.
  const loteIdsConDatos = [...new Set([...byLote.keys(), ...mermaPorLote.keys()])];
  const lotes = loteIdsConDatos.map((loteId) => { const values = [...(byLote.get(loteId)?.values() ?? [])].sort(sortCalibreRows); const bulbs = values.reduce((sum, row) => sum + row.bulbs, 0); return { loteId, codigoLote: nameMap.get(loteId) ?? loteId.slice(0, 8), bulbs, percent: 0, rows: values.map((row) => ({ ...row, percent: roundedPercent(row.bulbs, bulbs), salidas: finishSalidas(row.salidas, row.bulbs) })), mermaBulbs: mermaPorLote.get(loteId) ?? 0 }; }).sort((a, b) => a.codigoLote.localeCompare(b.codigoLote, "es"));
  // `bulbs` y `totalBulbs` son producto calibrado: la merma va aparte, no suma.
  const totalBulbs = lotes.reduce((sum, row) => sum + row.bulbs, 0); for (const row of lotes) row.percent = roundedPercent(row.bulbs, totalBulbs);
  const mermaBulbs = lotes.reduce((sum, row) => sum + row.mermaBulbs, 0);
  return { kind, serviceId, serviceName: metadata.serviceName, companyName: metadata.companyName, processName: metadata.processName, reportDate, generatedAt: new Date().toISOString(), calibreSource: "declarado", totalBulbs, rows: mergeServiceRows(lotes), lotes, mermaBulbs };
}

/** Reporte diario en modo medido: un dia acotado por indice sobre `conteo`. */
async function countsFromConteo(
  serviceId: string,
  loteIds: string[],
  reportDate: string
): Promise<CountRow[]> {
  const day = localDayRange(reportDate);
  const rows = await db
    .select({
      loteId: conteo.loteId,
      perimeter: conteo.perimeter,
      bulbs: sql<number>`COUNT(*)::int`,
    })
    .from(conteo)
    .where(
      and(
        eq(conteo.servicioId, serviceId),
        inArray(conteo.loteId, loteIds),
        sql`${conteo.ts} >= ${day.from}`,
        sql`${conteo.ts} < ${day.to}`
      )
    )
    .groupBy(conteo.loteId, conteo.perimeter);
  return rows.map((row) => ({
    loteId: row.loteId,
    perimeter: row.perimeter == null ? null : Number(row.perimeter),
    bulbs: Number(row.bulbs),
  }));
}

/**
 * Reporte acumulado en modo medido: se lee de los agregados que mantiene
 * `conteo_stats_trigger`, no de `conteo`.
 *
 * Agregar el historico completo de un servicio sobre `conteo` cuesta ~49 s
 * (seq scan de 62M filas) y por si solo agota el maxDuration de la ruta;
 * `lote_stats` tiene 27k filas y da el mismo numero, porque el reporte cuenta
 * todas las filas sin filtrar `direction` (= count_in + count_out).
 *
 * Unica diferencia semantica: `lote_stats.calibre` es ROUND(perimeter, 1), asi
 * que un perimetro de 7.96 cae en el tramo 8-10 en vez de "Menor a 8". Es una
 * tolerancia de 0,05 cm solo en los bordes de rango.
 */
async function countsFromLoteStats(serviceId: string, loteIds: string[]): Promise<CountRow[]> {
  const [porCalibre, totales] = await Promise.all([
    db
      .select({
        loteId: loteStats.loteId,
        perimeter: loteStats.calibre,
        bulbs: sql<number>`SUM(${loteStats.countIn} + ${loteStats.countOut})::int`,
      })
      .from(loteStats)
      .where(and(eq(loteStats.servicioId, serviceId), inArray(loteStats.loteId, loteIds)))
      .groupBy(loteStats.loteId, loteStats.calibre),
    db
      .select({
        loteId: loteTotalStats.loteId,
        bulbs: sql<number>`SUM(${loteTotalStats.countIn} + ${loteTotalStats.countOut})::int`,
      })
      .from(loteTotalStats)
      .where(and(eq(loteTotalStats.servicioId, serviceId), inArray(loteTotalStats.loteId, loteIds)))
      .groupBy(loteTotalStats.loteId),
  ]);

  const rows: CountRow[] = porCalibre.map((row) => ({
    loteId: row.loteId,
    perimeter: row.perimeter == null ? null : Number(row.perimeter),
    bulbs: Number(row.bulbs),
  }));

  // `lote_stats` solo guarda filas con perimeter IS NOT NULL; lo que falta para
  // el total del lote son las mediciones sin calibre.
  const conCalibre = new Map<string, number>();
  for (const row of rows) conCalibre.set(row.loteId, (conCalibre.get(row.loteId) ?? 0) + row.bulbs);
  for (const total of totales) {
    const sinCalibre = Number(total.bulbs) - (conCalibre.get(total.loteId) ?? 0);
    if (sinCalibre > 0) rows.push({ loteId: total.loteId, perimeter: null, bulbs: sinCalibre });
  }
  return rows;
}

export async function buildServiceReport(
  serviceId: string,
  kind: ReportKind,
  reportDate: string
): Promise<ServiceReport> {
  const serviceRows = await db
    .select({
      serviceId: servicio.id,
      serviceName: servicio.nombre,
      companyName: empresa.nombre,
      processName: tipoProceso.nombre,
      modoCalibre: servicio.modoCalibre,
    })
    .from(servicio)
    .innerJoin(empresa, eq(empresa.id, servicio.empresaId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(eq(servicio.id, serviceId))
    .limit(1);

  const metadata = serviceRows[0];
  if (!metadata) throw new Error(`Servicio no encontrado: ${serviceId}`);

  const links = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(eq(loteServicio.servicioId, serviceId));
  const loteIds = [...new Set(links.map((link) => link.loteId))];
  if (loteIds.length === 0) {
    return {
      kind,
      serviceId,
      serviceName: metadata.serviceName,
      companyName: metadata.companyName,
      processName: metadata.processName ?? null,
      reportDate,
      generatedAt: new Date().toISOString(),
      calibreSource: metadata.modoCalibre === "declarado" ? "declarado" : "medido",
      totalBulbs: 0,
      rows: [],
      lotes: [],
      mermaBulbs: 0,
    };
  }

  if (metadata.modoCalibre === "declarado") return buildDeclaredServiceReport(metadata, serviceId, loteIds, kind, reportDate);

  const counts = kind === "daily"
    ? await countsFromConteo(serviceId, loteIds, reportDate)
    : await countsFromLoteStats(serviceId, loteIds);

  const names = await db
    .select({ id: lote.id, codigo: lote.codigoLote })
    .from(lote)
    .where(inArray(lote.id, [...new Set(counts.map((row) => row.loteId))]));
  const nameMap = new Map(names.map((row) => [row.id, row.codigo ?? row.id.slice(0, 8)]));

  // Igual que en /lotes/resumen-calibres: este reporte usa el calibre MEDIDO (QB) y se
  // acota a las declaraciones legacy a nivel de lote (dispositivo_id IS NULL). Los
  // servicios en modo 'declarado' se resuelven aparte vía calibre-resolver.ts — ver
  // plan de calibre declarado por salida (F4, pendiente de integrar acá).
  const manualRowsRaw = await db
    .select({
      loteId: loteCierreCalibreBin.loteId,
      from: loteCierreCalibreBin.calibreFrom,
      to: loteCierreCalibreBin.calibreTo,
      bins: loteCierreCalibreBin.bins,
    })
    .from(loteCierreCalibreBin)
    .where(
      and(
        eq(loteCierreCalibreBin.servicioId, serviceId),
        inArray(loteCierreCalibreBin.loteId, loteIds),
        isNull(loteCierreCalibreBin.dispositivoId)
      )
    )
    .orderBy(asc(loteCierreCalibreBin.calibreFrom));
  const manualRows = manualRowsRaw.filter(
    (row): row is typeof row & { from: number; to: number } =>
      row.from !== null && row.to !== null
  );
  const rangeMap = new Map<string, ManualRange[]>();
  for (const row of manualRows) {
    const ranges = rangeMap.get(row.loteId) ?? [];
    ranges.push({ from: row.from, to: row.to, bins: Number(row.bins) || 0 });
    rangeMap.set(row.loteId, ranges);
  }

  const grouped = new Map<string, CountRow[]>();
  for (const row of counts) {
    const current = grouped.get(row.loteId) ?? [];
    current.push(row);
    grouped.set(row.loteId, current);
  }

  const lotes = [...grouped.entries()]
    .map(([loteId, rows]) => buildLote(
      rows[0],
      rows,
      nameMap.get(loteId) ?? loteId.slice(0, 8),
      rangeMap.get(loteId) ?? []
    ))
    .sort((left, right) => left.codigoLote.localeCompare(right.codigoLote, "es"));
  const totalBulbs = lotes.reduce((sum, current) => sum + current.bulbs, 0);
  for (const current of lotes) current.percent = roundedPercent(current.bulbs, totalBulbs);

  return {
    kind,
    serviceId,
    serviceName: metadata.serviceName,
    companyName: metadata.companyName,
    processName: metadata.processName ?? null,
    reportDate,
    generatedAt: new Date().toISOString(),
    calibreSource: "medido",
    totalBulbs,
    rows: mergeServiceRows(lotes),
    lotes,
    mermaBulbs: 0,
  };
}
