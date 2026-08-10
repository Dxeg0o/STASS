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
  subvariedad,
  tipoProceso,
} from "@/db/schema";
import type {
  ReportCalibreRow,
  ReportKind,
  ReportLabel,
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
  label: ReportLabel;
  bulbs: number;
  bins: number;
  declarado: boolean;
};

function roundedPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
}

/**
 * Los rangos van en orden numerico y lo que no es un rango declarado se va al
 * final: es un balde, no un calibre, y no tiene lugar en la escala.
 */
function calibreOrder(row: { label: ReportLabel; declarado: boolean }) {
  if (!row.declarado) return Number.POSITIVE_INFINITY;
  const match = row.label.en.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function sortCalibreRows<T extends { label: ReportLabel; declarado: boolean }>(left: T, right: T) {
  return (
    calibreOrder(left) - calibreOrder(right) ||
    left.label.en.localeCompare(right.label.en, "en")
  );
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

/**
 * Etiqueta de un rango cerrado, el unico que cuenta como calibre.
 *
 * Se usa la misma notacion `from/to` que la tabla del lote en
 * @/lib/salida-calibre (formatCalibre) y que ve la operaria en la tablet: el
 * reporte no deberia inventar una escritura propia del mismo rango.
 */
function rangeLabel(from: number, to: number): ReportLabel {
  const value = `${from}/${to}`;
  return { es: value, en: value };
}

/**
 * Codigo y variedad de cada lote, para rotular sus filas en el detalle.
 *
 * La variedad del reporte es `subvariedad.nombre` (Tabledance, Trocadero), que
 * es lo que el cliente llama variedad. `variedad.nombre` en el modelo es el
 * nivel de arriba —"OT Hibridos", "Orientales"—, mas cerca de la especie que de
 * la variedad, y no es lo que se quiere ver en la columna.
 */
async function loteNames(loteIds: string[]) {
  const rows = await db
    .select({ id: lote.id, codigo: lote.codigoLote, variedad: subvariedad.nombre })
    .from(lote)
    .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
    .where(inArray(lote.id, loteIds));
  return new Map(
    rows.map((row) => [
      row.id,
      { codigoLote: row.codigo ?? row.id.slice(0, 8), variedad: row.variedad ?? null },
    ])
  );
}

function loteName(names: Awaited<ReturnType<typeof loteNames>>, loteId: string) {
  return names.get(loteId) ?? { codigoLote: loteId.slice(0, 8), variedad: null };
}

/**
 * Los lotes salen agrupados por variedad y, dentro de ella, por codigo.
 *
 * El detalle separa una variedad de la siguiente con una fila en blanco; si el
 * orden fuera solo por codigo, dos lotes de la misma variedad podrian quedar
 * partidos por uno de otra y el corte no agruparia nada. Los lotes sin variedad
 * van al final, juntos.
 */
function sortLotes(left: ReportLote, right: ReportLote) {
  if (left.variedad !== right.variedad) {
    if (left.variedad === null) return 1;
    if (right.variedad === null) return -1;
    return left.variedad.localeCompare(right.variedad, "es");
  }
  return left.codigoLote.localeCompare(right.codigoLote, "es");
}

/**
 * Balde de lo que no cae en ningun rango declarado.
 *
 * No es un calibre y se rotula como tal: antes esto se abria en "Menor a",
 * "Mayor a" y "Sin rango manual", que se leian como calibres cuando en realidad
 * son unidades fuera de lo que la operaria demarco al cerrar el lote.
 */
const FUERA_DE_RANGO: ReportLabel = {
  es: "Fuera de los rangos declarados",
  en: "Outside the declared ranges",
};

/**
 * Bulbos de un lote que todavia no se cierra en la tablet.
 *
 * No son merma: nadie declaro nada aun. Se rotulan como pendientes para no
 * afirmar un descarte que el dato no respalda.
 */
const PENDIENTE: ReportLabel = {
  es: "Pendiente de declarar (lote sin cerrar)",
  en: "Pending declaration (lot not closed)",
};

function bucketFor(
  perimeter: number | null,
  ranges: ManualRange[]
): { key: string; label: ReportLabel; bins: number; declarado: boolean } {
  if (perimeter != null && Number.isFinite(perimeter)) {
    // Sin rangos declarados no hay cierre que respetar: se cae al tramo de 1 cm
    // para no perder el dato, y se marca como no declarado.
    if (ranges.length === 0) {
      const from = Math.floor(perimeter);
      return {
        key: `automatico:${from}`,
        label: rangeLabel(from, from + 1),
        bins: 0,
        declarado: false,
      };
    }
    const matching = ranges.find((range) => perimeter >= range.from && perimeter < range.to);
    if (matching) {
      return {
        key: `manual:${matching.from}:${matching.to}`,
        label: rangeLabel(matching.from, matching.to),
        bins: matching.bins,
        declarado: true,
      };
    }
  }
  return { key: "fuera-de-rango", label: FUERA_DE_RANGO, bins: 0, declarado: false };
}

function buildLote(
  row: CountRow,
  rows: CountRow[],
  name: { codigoLote: string; variedad: string | null },
  ranges: ManualRange[]
): ReportLote {
  // Se siembra un bucket por rango declarado al cierre, aunque no haya contado
  // nada: un calibre demarcado que salio en cero es informacion, y omitirlo
  // hacia parecer que la operaria nunca lo definio.
  const buckets = new Map<string, LoteBucket>(
    ranges.map((range) => [
      `manual:${range.from}:${range.to}`,
      {
        key: `manual:${range.from}:${range.to}`,
        label: rangeLabel(range.from, range.to),
        bulbs: 0,
        bins: range.bins,
        declarado: true,
      },
    ])
  );
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
        declarado: bucket.declarado,
      });
    }
  }

  const bulbs = rows.reduce((sum, item) => sum + item.bulbs, 0);
  return {
    loteId: row.loteId,
    ...name,
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

/**
 * Un rango es un calibre solo si esta cerrado por los dos extremos.
 *
 * Un extremo abierto no es un calibre demarcado sino merma con umbral — mismo
 * criterio que usa la tabla del lote en @/lib/salida-calibre (formatCalibre).
 */
function rangoCerrado(
  from: number | null,
  to: number | null
): { from: number; to: number } | null {
  return from !== null && to !== null ? { from, to } : null;
}

async function buildDeclaredServiceReport(metadata: { serviceName: string; companyName: string; processName: string | null }, serviceId: string, loteIds: string[], kind: ReportKind, reportDate: string): Promise<ServiceReport> {
  const conditions = [eq(loteCalibreDeclaradoDia.servicioId, serviceId), inArray(loteCalibreDeclaradoDia.loteId, loteIds)];
  if (kind === "daily") conditions.push(eq(loteCalibreDeclaradoDia.dia, reportDate));
  const summary = await db.select().from(loteCalibreDeclaradoDia).where(and(...conditions));
  const usedLoteIds = [...new Set(summary.map((row) => row.loteId))];
  if (usedLoteIds.length === 0) return { kind, serviceId, serviceName: metadata.serviceName, companyName: metadata.companyName, processName: metadata.processName, reportDate, generatedAt: new Date().toISOString(), calibreSource: "declarado", totalBulbs: 0, lotes: [], mermaBulbs: 0 };
  const nameMap = await loteNames(usedLoteIds);
  const declarations = await db.select({ loteId: loteCierreCalibreBin.loteId, dispositivoId: loteCierreCalibreBin.dispositivoId, from: loteCierreCalibreBin.calibreFrom, to: loteCierreCalibreBin.calibreTo, bins: loteCierreCalibreBin.bins }).from(loteCierreCalibreBin).where(and(eq(loteCierreCalibreBin.servicioId, serviceId), inArray(loteCierreCalibreBin.loteId, usedLoteIds), isNotNull(loteCierreCalibreBin.dispositivoId)));
  const bins = new Map<string, number>();
  for (const row of declarations) { const key = `${row.loteId}:${row.from ?? ""}:${row.to ?? ""}`; bins.set(key, (bins.get(key) ?? 0) + (Number(row.bins) || 0)); }

  // Los calibres del reporte SON los rangos que la operaria dejo demarcados al
  // cerrar el lote en la tablet. Se siembran aca, antes de repartir unidades,
  // para que un rango declarado que salio en cero igual aparezca en su lote.
  const rangosPorLote = new Map<string, Map<string, ReportCalibreRow>>();
  for (const row of declarations) {
    const rango = rangoCerrado(row.from, row.to);
    if (!rango) continue;
    const key = `${rango.from}:${rango.to}`;
    const rows = rangosPorLote.get(row.loteId) ?? new Map<string, ReportCalibreRow>();
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        label: rangeLabel(rango.from, rango.to),
        bulbs: 0,
        bins: bins.get(`${row.loteId}:${rango.from}:${rango.to}`) ?? 0,
        percent: 0,
        salidas: [],
        declarado: true,
      });
    }
    rangosPorLote.set(row.loteId, rows);
  }
  // Etiqueta de cada salida del servicio. Se resuelve una vez y no por fila:
  // la salida es configuración del servicio, no del lote ni del día.
  const salidaRows = await db
    .select({
      dispositivoId: dispositivoServicio.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      salidaOrden: dispositivoServicio.salidaOrden,
      salidaNombre: dispositivoServicio.salidaNombre,
      fechaTermino: dispositivoServicio.fechaTermino,
    })
    .from(dispositivoServicio)
    .innerJoin(dispositivo, eq(dispositivo.id, dispositivoServicio.dispositivoId))
    .where(eq(dispositivoServicio.servicioId, serviceId));

  // La salida de un equipo es FIJA: THOR-1 es Salida 1 aunque no pase un solo
  // bulbo por ahi. Nunca se renumera ni se deriva de quien produjo — sale de
  // dispositivo_servicio.salida_orden.
  //
  // Un equipo puede tener mas de un vinculo con el mismo servicio (uno terminado
  // y uno vigente). Sin elegir, el Map se quedaba con la ultima fila que llegara
  // de la DB, que puede ser la del vinculo viejo y con otro numero de salida.
  // Se prefiere el vigente (fecha_termino NULL) y, ante empate, el de menor orden.
  const salidaPorDispositivo = new Map<
    string,
    { salidaOrden: number | null; label: string; dispositivoNombre: string; vigente: boolean }
  >();
  for (const row of salidaRows) {
    const candidato = {
      salidaOrden: row.salidaOrden,
      // Misma convención que el resto: sin salida configurada se cae al
      // nombre del equipo en vez de mostrar un hueco.
      label: row.salidaNombre ?? row.dispositivoNombre,
      dispositivoNombre: row.dispositivoNombre,
      vigente: row.fechaTermino === null,
    };
    const actual = salidaPorDispositivo.get(row.dispositivoId);
    if (
      !actual ||
      (candidato.vigente && !actual.vigente) ||
      (candidato.vigente === actual.vigente &&
        actual.salidaOrden == null &&
        candidato.salidaOrden != null) ||
      (candidato.vigente === actual.vigente &&
        actual.salidaOrden != null &&
        candidato.salidaOrden != null &&
        candidato.salidaOrden < actual.salidaOrden)
    ) {
      salidaPorDispositivo.set(row.dispositivoId, candidato);
    }
  }

  // Que salidas declararon algo en cada lote. Es el criterio que separa la merma
  // del producto pendiente dentro del balde "sin declarar": una salida que nunca
  // declaro en el lote saco merma; una que si declaro y tiene unidades fuera de
  // sus rangos es producto que todavia no se declara. Mismo criterio que usa la
  // tabla del lote (ver @/lib/salida-calibre).
  const declaroEnLote = new Set(
    declarations.map((row) => `${row.loteId}|${row.dispositivoId}`)
  );

  // Lotes que efectivamente se cerraron. Sin esta condicion un lote todavia en
  // curso —donde ninguna salida declaro aun— salia entero como merma, afirmando
  // un descarte que el dato no respalda. Mismo guard que usa la tabla del lote
  // en @/lib/salida-calibre (`huboDeclaracion`).
  const lotesCerrados = new Set(declarations.map((row) => row.loteId));

  const mermaPorLote = new Map<string, number>();
  const byLote = new Map<string, Map<string, ReportCalibreRow>>(
    [...rangosPorLote].map(([loteId, rows]) => [loteId, new Map(rows)])
  );
  for (const row of summary) {
    const unidadesRow = Number(row.unidades) || 0;
    const rango = row.sinDeclarar ? null : rangoCerrado(row.calibreFrom, row.calibreTo);
    const loteCerrado = lotesCerrados.has(row.loteId);
    // Merma en los dos casos que la producen: la salida que, en un lote YA
    // CERRADO, no declaro ningun rango; y el rango con un extremo abierto, que
    // no es un calibre demarcado sino merma con umbral (mismo criterio que
    // @/lib/salida-calibre). En un lote sin cerrar no hay merma que afirmar.
    if (
      (row.sinDeclarar &&
        loteCerrado &&
        !declaroEnLote.has(`${row.loteId}|${row.dispositivoId}`)) ||
      (!row.sinDeclarar && !rango)
    ) {
      mermaPorLote.set(row.loteId, (mermaPorLote.get(row.loteId) ?? 0) + unidadesRow);
      continue;
    }
    // Lo que no cae en un rango declarado no es merma pero tampoco un calibre:
    // va a su propio balde, fuera de la escala de rangos. Se distingue el lote
    // sin cerrar (nadie declaro todavia) del cerrado con unidades sobrantes.
    const key = rango ? `${rango.from}:${rango.to}` : loteCerrado ? "fuera-de-rango" : "pendiente";
    const rows = byLote.get(row.loteId) ?? new Map<string, ReportCalibreRow>();
    const current =
      rows.get(key) ??
      ({
        key,
        label: rango ? rangeLabel(rango.from, rango.to) : loteCerrado ? FUERA_DE_RANGO : PENDIENTE,
        bulbs: 0,
        bins: rango ? bins.get(`${row.loteId}:${rango.from}:${rango.to}`) ?? 0 : 0,
        percent: 0,
        salidas: [],
        declarado: Boolean(rango),
      } satisfies ReportCalibreRow);
    current.bulbs += unidadesRow;
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
  const loteIdsConDatos = [...new Set([...byLote.keys(), ...mermaPorLote.keys()])].filter(
    (loteId) => usedLoteIds.includes(loteId)
  );
  const lotes = loteIdsConDatos.map((loteId) => { const values = [...(byLote.get(loteId)?.values() ?? [])].sort(sortCalibreRows); const bulbs = values.reduce((sum, row) => sum + row.bulbs, 0); return { loteId, ...loteName(nameMap, loteId), bulbs, percent: 0, rows: values.map((row) => ({ ...row, percent: roundedPercent(row.bulbs, bulbs), salidas: finishSalidas(row.salidas, row.bulbs) })), mermaBulbs: mermaPorLote.get(loteId) ?? 0 }; }).sort(sortLotes);
  // `bulbs` y `totalBulbs` son producto calibrado: la merma va aparte, no suma.
  const totalBulbs = lotes.reduce((sum, row) => sum + row.bulbs, 0); for (const row of lotes) row.percent = roundedPercent(row.bulbs, totalBulbs);
  const mermaBulbs = lotes.reduce((sum, row) => sum + row.mermaBulbs, 0);
  return { kind, serviceId, serviceName: metadata.serviceName, companyName: metadata.companyName, processName: metadata.processName, reportDate, generatedAt: new Date().toISOString(), calibreSource: "declarado", totalBulbs, lotes, mermaBulbs };
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
      lotes: [],
      mermaBulbs: 0,
    };
  }

  if (metadata.modoCalibre === "declarado") return buildDeclaredServiceReport(metadata, serviceId, loteIds, kind, reportDate);

  const counts = kind === "daily"
    ? await countsFromConteo(serviceId, loteIds, reportDate)
    : await countsFromLoteStats(serviceId, loteIds);

  const nameMap = await loteNames([...new Set(counts.map((row) => row.loteId))]);

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
      loteName(nameMap, loteId),
      rangeMap.get(loteId) ?? []
    ))
    .sort(sortLotes);
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
    lotes,
    mermaBulbs: 0,
  };
}
