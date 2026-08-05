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
    // Ojo: este numero NO incluye la merma, que va en la fila siguiente. La
    // etiqueta dice "procesados" por decision del cliente; el desglose de abajo
    // es lo que evita leerlo como el total de la linea.
    ["Bulbos procesados / Processed bulbs", report.totalBulbs],
    ["Merma / Waste (fuera del total)", report.mermaBulbs],
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
function detailRows(report: ServiceReport, withSalidas: boolean): Cell[][] {
  const head: Cell[] = withSalidas
    ? ["Lote / Lot", "Calibre / Size", "Salida / Outlet", "Bulbos", "%", "Bins"]
    : ["Lote / Lot", "Calibre / Size", "Bulbos", "%", "Bins"];
  const rows: Cell[][] = [head];
  for (const lote of report.lotes) {
    if (lote.rows.length === 0) {
      rows.push(
        withSalidas
          ? [lote.codigoLote, "Sin datos para el periodo", null, null, null, null]
          : [lote.codigoLote, "Sin datos para el periodo", null, null, null]
      );
      rows.push([]);
      continue;
    }
    lote.rows.forEach((row, index) => {
      const codigo = index === 0 ? lote.codigoLote : null;
      rows.push(
        withSalidas
          ? [codigo, row.label, "Todas / All", row.bulbs, row.percent, row.bins || null]
          : [codigo, row.label, row.bulbs, row.percent, row.bins || null]
      );
      // Una fila por salida bajo su calibre: el % es el peso de la salida dentro
      // de ese calibre, no sobre el lote.
      if (withSalidas) {
        for (const salida of row.salidas) {
          rows.push([null, null, salida.label, salida.bulbs, salida.percent, null]);
        }
      }
    });
    rows.push(
      withSalidas
        ? [null, "Total lote / Lot total", null, lote.bulbs, lote.percent, null]
        : [null, "Total lote / Lot total", lote.bulbs, lote.percent, null]
    );
    rows.push([]);
  }
  return rows;
}

// El % se muestra con su signo pero la celda sigue siendo numerica, para poder
// ordenar y calcular sobre ella.
const PERCENT_FORMAT = '0.00"%"';
const BULBS_FORMAT = "#,##0";

function reportSheet(report: ServiceReport, title: string) {
  // La columna de salida solo se agrega si el servicio realmente declara por
  // salida: en modo medido estaria vacia en todas las filas.
  const withSalidas = report.rows.some((row) => row.salidas.length > 0);

  const rows: Cell[][] = [
    ...header(report, title),
    ["Resumen por calibre / Size summary"],
    withSalidas
      ? ["Calibre / Size", "Salida / Outlet", "Bulbos", "%", "Bins"]
      : ["Calibre / Size", "Bulbos", "%", "Bins"],
  ];
  const summaryFrom = rows.length;
  for (const row of report.rows) {
    rows.push(
      withSalidas
        ? [row.label, "Todas / All", row.bulbs, row.percent, row.bins || null]
        : [row.label, row.bulbs, row.percent, row.bins || null]
    );
    // El % de la salida es su peso dentro del calibre, no sobre el total.
    if (withSalidas) {
      for (const salida of row.salidas) {
        rows.push([null, salida.label, salida.bulbs, salida.percent, null]);
      }
    }
  }
  if (report.rows.length === 0) rows.push(["Sin datos para el periodo / No data for this period"]);
  const summaryTo = rows.length - 1;

  rows.push([], ["Detalle por lote / Lot detail"]);
  const detailFrom = rows.length + 1;
  rows.push(...detailRows(report, withSalidas));
  const detailTo = rows.length - 1;

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = withSalidas
    ? [{ wch: 34 }, { wch: 34 }, { wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 10 }]
    : [{ wch: 34 }, { wch: 34 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
  // Las dos tablas tienen distinto orden de columnas, asi que el formato se
  // acota por bloque: en el resumen los bulbos van en B y el % en C; en el
  // detalle, desplazados una columna por el codigo de lote. Con la columna de
  // salida, ambos bloques se desplazan una columna mas.
  const offset = withSalidas ? 1 : 0;
  formatCells(sheet, 1 + offset, summaryFrom, summaryTo, BULBS_FORMAT);
  formatCells(sheet, 2 + offset, summaryFrom, summaryTo, PERCENT_FORMAT);
  formatCells(sheet, 2 + offset, detailFrom, detailTo, BULBS_FORMAT);
  formatCells(sheet, 3 + offset, detailFrom, detailTo, PERCENT_FORMAT);
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
