import * as XLSX from "xlsx";
import type { ServiceReport } from "./types";

/**
 * Version Excel de los mismos datos que van en los PDF.
 *
 * `xlsx` ya es dependencia del proyecto (se usa client-side en los exports de
 * /servicios y /lotes); aca se genera server-side con type "buffer", que
 * funciona en el runtime nodejs que declara la ruta del cron.
 */

type Cell = string | number | null;

const SHEET_DAILY = "Diario";
const SHEET_TOTAL = "Acumulado";

function calibreSourceLabel(report: ServiceReport) {
  return report.calibreSource === "declarado"
    ? "Declarado por salida / Declared per outlet"
    : "Medido / Measured";
}

function header(report: ServiceReport, title: string): Cell[][] {
  return [
    [title],
    ["Empresa / Company", report.companyName],
    ["Servicio / Service", report.serviceName],
    ["Proceso / Process", report.processName ?? "-"],
    ["Fecha reportada / Report date", report.reportDate],
    [
      "Generado / Generated",
      new Date(report.generatedAt).toLocaleString("es-CL", { timeZone: "America/Santiago" }),
    ],
    ["Origen del calibre / Size source", calibreSourceLabel(report)],
    [],
    ["Bulbos procesados / Processed bulbs", report.totalBulbs],
    ["Lotes procesados / Processed lots", report.lotes.length],
    [],
  ];
}

/**
 * Detalle agrupado por lote: el codigo va solo en la primera fila de su bloque
 * y los bloques se separan con una fila en blanco, para leerlo de corrido sin
 * la columna repetida. Se prefiere esto a `!merges` porque una celda combinada
 * rompe el ordenar y el filtrar sobre la tabla.
 */
function detailRows(report: ServiceReport): Cell[][] {
  const rows: Cell[][] = [["Lote / Lot", "Calibre / Size", "Bulbos", "%", "Bins"]];
  for (const lote of report.lotes) {
    if (lote.rows.length === 0) {
      rows.push([lote.codigoLote, "Sin datos para el periodo", null, null, null]);
      rows.push([]);
      continue;
    }
    lote.rows.forEach((row, index) => {
      rows.push([
        index === 0 ? lote.codigoLote : null,
        row.label,
        row.bulbs,
        row.percent,
        row.bins || null,
      ]);
    });
    rows.push([null, "Total lote / Lot total", lote.bulbs, lote.percent, null]);
    rows.push([]);
  }
  return rows;
}

// El % se muestra con su signo pero la celda sigue siendo numerica, para poder
// ordenar y calcular sobre ella.
const PERCENT_FORMAT = '0.00"%"';
const BULBS_FORMAT = "#,##0";

function reportSheet(report: ServiceReport, title: string) {
  const rows: Cell[][] = [
    ...header(report, title),
    ["Resumen por calibre / Size summary"],
    ["Calibre / Size", "Bulbos", "%", "Bins"],
  ];
  const summaryFrom = rows.length;
  for (const row of report.rows) rows.push([row.label, row.bulbs, row.percent, row.bins || null]);
  if (report.rows.length === 0) rows.push(["Sin datos para el periodo / No data for this period"]);
  const summaryTo = rows.length - 1;

  rows.push([], ["Detalle por lote / Lot detail"]);
  const detailFrom = rows.length + 1;
  rows.push(...detailRows(report));
  const detailTo = rows.length - 1;

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 34 }, { wch: 34 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
  // Las dos tablas tienen distinto orden de columnas, asi que el formato se
  // acota por bloque: en el resumen los bulbos van en B y el % en C; en el
  // detalle, desplazados una columna por el codigo de lote.
  formatCells(sheet, 1, summaryFrom, summaryTo, BULBS_FORMAT);
  formatCells(sheet, 2, summaryFrom, summaryTo, PERCENT_FORMAT);
  formatCells(sheet, 2, detailFrom, detailTo, BULBS_FORMAT);
  formatCells(sheet, 3, detailFrom, detailTo, PERCENT_FORMAT);
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

export function renderServiceReportWorkbook(daily: ServiceReport, total: ServiceReport): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reportSheet(daily, "Resumen diario / Daily summary"), SHEET_DAILY);
  XLSX.utils.book_append_sheet(
    workbook,
    reportSheet(total, "Resumen acumulado / Service total summary"),
    SHEET_TOTAL
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
