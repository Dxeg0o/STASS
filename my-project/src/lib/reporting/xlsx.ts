import * as XLSX from "xlsx";
import { label as translate, strings, type ReportStrings } from "./i18n";
import type { ReportLang, ServiceReport } from "./types";

/**
 * Version Excel de los mismos datos que van en los PDF.
 *
 * `xlsx` ya es dependencia del proyecto (se usa client-side en los exports de
 * /servicios y /lotes); aca se genera server-side con type "buffer", que
 * funciona en el runtime nodejs que declara la ruta del cron.
 *
 * No hay hoja ni bloque de resumen por calibre: el reporte se rige por el lote.
 * Agregar calibres entre lotes mezcla rangos que cada cierre demarco por
 * separado, asi que la unica escala valida es la de cada lote.
 */

type Cell = string | number | null;

function calibreSourceLabel(report: ServiceReport, t: ReportStrings) {
  return report.calibreSource === "declarado" ? t.sizeSourceDeclared : t.sizeSourceMeasured;
}

function header(report: ServiceReport, title: string, t: ReportStrings): Cell[][] {
  const bins = report.lotes.reduce(
    (sum, lote) => sum + lote.rows.reduce((inner, row) => inner + row.bins, 0),
    0
  );
  return [
    [title],
    [t.company, report.companyName],
    [t.service, report.serviceName],
    [t.process, report.processName ?? "-"],
    [t.reportDate, report.reportDate],
    [t.generated, new Date(report.generatedAt).toLocaleString(t.locale, { timeZone: "America/Santiago" })],
    [t.sizeSource, calibreSourceLabel(report, t)],
    [],
    // Ojo: este numero NO incluye la merma, que va en la fila siguiente. La
    // etiqueta dice "procesados" por decision del cliente; el desglose de abajo
    // es lo que evita leerlo como el total de la linea.
    [t.bulbsProcessed, report.totalBulbs],
    [t.lots, report.lotes.length],
    [t.bins, bins],
    [],
  ];
}

/**
 * Detalle plano: variedad y lote se repiten en cada fila, incluida la de total
 * del lote. Antes el codigo iba solo en la primera fila del bloque, lo que se
 * lee bien pero deja la tabla inservible para ordenar, filtrar o pegarla en una
 * dinamica — que es lo que se hace con el Excel. Por lo mismo no hay celdas
 * combinadas, y la unica fila en blanco es la que separa una variedad de la
 * siguiente: entre lotes de la misma variedad la tabla sigue de corrido.
 *
 * El % de una fila de calibre es dentro de su lote; el de la fila de total es
 * el peso del lote en el periodo.
 */
function detailRows(report: ServiceReport, lang: ReportLang, t: ReportStrings): Cell[][] {
  const rows: Cell[][] = [[t.variety, t.lot, t.size, t.bulbs, "%", t.bins]];

  let variedadAnterior: string | null | undefined;
  for (const lote of report.lotes) {
    if (variedadAnterior !== undefined && lote.variedad !== variedadAnterior) rows.push([]);
    variedadAnterior = lote.variedad;
    const head: Cell[] = [lote.variedad ?? "-", lote.codigoLote];
    if (lote.rows.length === 0) {
      rows.push([...head, t.noData, null, null, null]);
      continue;
    }
    for (const row of lote.rows) {
      rows.push([
        ...head,
        translate(row.label, lang),
        row.bulbs,
        row.percent,
        row.bins || null,
      ]);
    }
    const bins = lote.rows.reduce((sum, row) => sum + row.bins, 0);
    rows.push([...head, t.lotTotal, lote.bulbs, lote.percent, bins || null]);
  }
  return rows;
}

// El % se muestra con su signo pero la celda sigue siendo numerica, para poder
// ordenar y calcular sobre ella.
const PERCENT_FORMAT = '0.00"%"';
const BULBS_FORMAT = "#,##0";

function reportSheet(report: ServiceReport, title: string, lang: ReportLang) {
  const t = strings(lang);
  const rows: Cell[][] = [...header(report, title, t), [t.lotDetail]];
  const detailFrom = rows.length + 1;
  rows.push(...detailRows(report, lang, t));
  const detailTo = rows.length - 1;

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
  ];
  formatCells(sheet, 3, detailFrom, detailTo, BULBS_FORMAT);
  formatCells(sheet, 4, detailFrom, detailTo, PERCENT_FORMAT);
  return sheet;
}

/** Aplica un formato numerico a una columna dentro de un rango de filas. */
function formatCells(
  sheet: XLSX.WorkSheet,
  column: number,
  fromRow: number,
  toRow: number,
  format: string
) {
  for (let row = fromRow; row <= toRow; row++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (cell && cell.t === "n") cell.z = format;
  }
}

export function renderServiceReportWorkbook(
  daily: ServiceReport,
  total: ServiceReport,
  lang: ReportLang = "en"
): Buffer {
  const t = strings(lang);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reportSheet(daily, t.dailyTitle, lang), t.sheetDaily);
  XLSX.utils.book_append_sheet(workbook, reportSheet(total, t.totalTitle, lang), t.sheetTotal);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
