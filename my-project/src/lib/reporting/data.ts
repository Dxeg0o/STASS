import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conteo,
  empresa,
  lote,
  loteCierreCalibreBin,
  loteServicio,
  proceso,
  servicio,
  tipoProceso,
} from "@/db/schema";
import type {
  ReportCalibreRow,
  ReportActiveDay,
  ReportKind,
  ReportLote,
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

function formatDateUtc(date: Date) {
  return date.toISOString().slice(0, 10);
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

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: REPORT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

function formatActiveDay(date: string, firstTs: Date, lastTs: Date): ReportActiveDay {
  return { date, startTime: formatTime(firstTs), endTime: formatTime(lastTs) };
}

function workedHoursByDay(days: Map<string, { firstTs: Date; lastTs: Date }>) {
  let hours = 0;
  for (const day of days.values()) {
    hours += Math.max(0, day.lastTs.getTime() - day.firstTs.getTime()) / 3_600_000;
  }
  return Math.round(hours * 10) / 10;
}

function buildLote(
  row: CountRow,
  rows: CountRow[],
  codigoLote: string,
  ranges: ManualRange[],
  activeDays: ReportActiveDay[]
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
    activeDays,
    rows: [...buckets.values()]
      .sort(sortCalibreRows)
      .map((bucket) => ({
        ...bucket,
        percent: roundedPercent(bucket.bulbs, bulbs),
      })),
  };
}

function mergeServiceRows(lotes: ReportLote[]) {
  const buckets = new Map<string, ReportCalibreRow>();
  for (const current of lotes) {
    for (const row of current.rows) {
      const existing = buckets.get(row.key);
      if (existing) {
        existing.bulbs += row.bulbs;
        existing.bins += row.bins;
      } else {
        buckets.set(row.key, { ...row });
      }
    }
  }
  const total = lotes.reduce((sum, current) => sum + current.bulbs, 0);
  return [...buckets.values()]
    .sort(sortCalibreRows)
    .map((row) => ({ ...row, percent: roundedPercent(row.bulbs, total) }));
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
      totalBulbs: 0,
      workedHours: 0,
      workedDays: 0,
      rows: [],
      lotes: [],
    };
  }

  const conditions = [eq(conteo.servicioId, serviceId), inArray(conteo.loteId, loteIds)];
  if (kind === "daily") {
    conditions.push(
      sql`(${conteo.ts} AT TIME ZONE ${REPORT_TIME_ZONE_SQL})::date = ${reportDate}`
    );
  }

  const counts = await db
    .select({
      loteId: conteo.loteId,
      perimeter: conteo.perimeter,
      bulbs: sql<number>`COUNT(*)::int`,
    })
    .from(conteo)
    .where(and(...conditions))
    .groupBy(conteo.loteId, conteo.perimeter);

  const activityConditions = [eq(conteo.servicioId, serviceId), inArray(conteo.loteId, loteIds)];
  if (kind === "daily") {
    activityConditions.push(
      sql`(${conteo.ts} AT TIME ZONE ${REPORT_TIME_ZONE_SQL})::date = ${reportDate}`
    );
  }
  const localDateExpr = sql<string>`TO_CHAR(${conteo.ts} AT TIME ZONE ${REPORT_TIME_ZONE_SQL}, 'YYYY-MM-DD')`;
  const activityRows = await db
    .select({
      loteId: conteo.loteId,
      date: localDateExpr,
      firstTs: sql<Date>`MIN(${conteo.ts})`,
      lastTs: sql<Date>`MAX(${conteo.ts})`,
    })
    .from(conteo)
    .where(and(...activityConditions))
    .groupBy(conteo.loteId, localDateExpr);

  const names = await db
    .select({ id: lote.id, codigo: lote.codigoLote })
    .from(lote)
    .where(inArray(lote.id, [...new Set(counts.map((row) => row.loteId))]));
  const nameMap = new Map(names.map((row) => [row.id, row.codigo ?? row.id.slice(0, 8)]));

  const manualRows = await db
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
        inArray(loteCierreCalibreBin.loteId, loteIds)
      )
    )
    .orderBy(asc(loteCierreCalibreBin.calibreFrom));
  const rangeMap = new Map<string, ManualRange[]>();
  for (const row of manualRows) {
    const ranges = rangeMap.get(row.loteId) ?? [];
    ranges.push({ from: row.from, to: row.to, bins: Number(row.bins) || 0 });
    rangeMap.set(row.loteId, ranges);
  }

  const grouped = new Map<string, CountRow[]>();
  for (const row of counts) {
    const current = grouped.get(row.loteId) ?? [];
    current.push({ loteId: row.loteId, perimeter: row.perimeter == null ? null : Number(row.perimeter), bulbs: Number(row.bulbs) });
    grouped.set(row.loteId, current);
  }

  const activeDaysByLote = new Map<string, ReportActiveDay[]>();
  const serviceDays = new Map<string, { firstTs: Date; lastTs: Date }>();
  for (const row of activityRows) {
    const firstTs = new Date(row.firstTs);
    const lastTs = new Date(row.lastTs);
    const date = String(row.date).slice(0, 10);
    const days = activeDaysByLote.get(row.loteId) ?? [];
    days.push(formatActiveDay(date, firstTs, lastTs));
    days.sort((left, right) => left.date.localeCompare(right.date));
    activeDaysByLote.set(row.loteId, days);
    const serviceDay = serviceDays.get(date);
    if (serviceDay) {
      serviceDay.firstTs = firstTs < serviceDay.firstTs ? firstTs : serviceDay.firstTs;
      serviceDay.lastTs = lastTs > serviceDay.lastTs ? lastTs : serviceDay.lastTs;
    } else {
      serviceDays.set(date, { firstTs, lastTs });
    }
  }

  const lotes = [...grouped.entries()]
    .map(([loteId, rows]) => buildLote(
      rows[0],
      rows,
      nameMap.get(loteId) ?? loteId.slice(0, 8),
      rangeMap.get(loteId) ?? [],
      activeDaysByLote.get(loteId) ?? []
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
    totalBulbs,
    workedHours: workedHoursByDay(serviceDays),
    workedDays: serviceDays.size,
    rows: mergeServiceRows(lotes),
    lotes,
  };
}
