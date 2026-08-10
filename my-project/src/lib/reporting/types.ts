export type ReportKind = "daily" | "total";

/** Idioma de salida. Los entregables van en ingles; el español es de revision. */
export type ReportLang = "en" | "es";

/**
 * Etiqueta en los dos idiomas.
 *
 * Se guardan por separado y no como un string "Calibre / Size 8-10 cm" porque
 * de ese formato no se puede recuperar el castellano: partir por " / " deja
 * "Calibre" y pierde el "8-10 cm".
 */
export interface ReportLabel {
  es: string;
  en: string;
}

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
  label: ReportLabel;
  bulbs: number;
  bins: number;
  percent: number;
  /** Desglose por salida dentro de este calibre. Vacío en modo medido. */
  salidas: ReportSalidaRow[];
  /**
   * True si el rango salió del cierre del lote en la tablet. False en el balde
   * de lo que no cae en ningún rango declarado, que no es un calibre.
   */
  declarado: boolean;
}

export interface ReportLote {
  loteId: string;
  codigoLote: string;
  /**
   * Variedad del lote, en el sentido del cliente: sale de `subvariedad.nombre`
   * (Tabledance, Trocadero). El campo `variedad` del modelo es el grupo de
   * arriba ("OT Hibridos") y no va al reporte. Null si el lote no la tiene.
   */
  variedad: string | null;
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
