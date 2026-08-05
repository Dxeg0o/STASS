export type ReportKind = "daily" | "total";

/**
 * Aporte de una salida física del calibrador dentro de un rango de calibre.
 *
 * Solo se puebla en servicios con modoCalibre 'declarado' y con salidas
 * configuradas en dispositivo_servicio; en modo medido queda vacío, porque ahí
 * el calibre sale del perímetro y no de lo que declara una salida.
 */
export interface ReportSalidaRow {
  /** salida_orden, para ordenar. Null si el equipo no tiene salida configurada. */
  salidaOrden: number | null;
  /** "Salida 2", o el nombre del equipo si el servicio no usa salidas. */
  label: string;
  /** Nombre del dispositivo, para poder rastrearlo en terreno. */
  dispositivoNombre: string;
  bulbs: number;
  percent: number;
}

export interface ReportCalibreRow {
  key: string;
  label: string;
  bulbs: number;
  bins: number;
  percent: number;
  /** Desglose por salida dentro de este calibre. Vacío en modo medido. */
  salidas: ReportSalidaRow[];
}

export interface ReportLote {
  loteId: string;
  codigoLote: string;
  /**
   * Bulbos con calibre declarado. NO incluye la merma — se muestra como
   * "Bulbos procesados", pero el numero deja el descarte fuera.
   */
  bulbs: number;
  percent: number;
  rows: ReportCalibreRow[];
  /**
   * Bulbos que salieron por una salida que no declaró calibre en este lote,
   * habiendo el lote tenido cierre. Va aparte y fuera de `bulbs` porque es
   * descarte, no producto calibrado.
   */
  mermaBulbs: number;
}

export interface ServiceReport {
  kind: ReportKind;
  serviceId: string;
  serviceName: string;
  companyName: string;
  processName: string | null;
  reportDate: string;
  generatedAt: string;
  calibreSource: "medido" | "declarado";
  /**
   * Bulbos con calibre declarado. NO incluye la merma — se muestra como
   * "Bulbos procesados", pero el numero deja el descarte fuera.
   */
  totalBulbs: number;
  rows: ReportCalibreRow[];
  lotes: ReportLote[];
  /**
   * Merma del periodo, fuera de `totalBulbs`. Siempre 0 en modo medido: ahí el
   * calibre sale del perímetro, no hay salida que declare ni deje de declarar.
   */
  mermaBulbs: number;
}

export interface ReportPair {
  daily: ServiceReport;
  total: ServiceReport;
  dailyPdf: Buffer;
  totalPdf: Buffer;
  /** Un solo libro con el diario y el acumulado, para no multiplicar adjuntos. */
  workbook: Buffer;
}
