export type ReportKind = "daily" | "total";

export interface ReportCalibreRow {
  key: string;
  label: string;
  bulbs: number;
  bins: number;
  percent: number;
}

export interface ReportLote {
  loteId: string;
  codigoLote: string;
  bulbs: number;
  percent: number;
  rows: ReportCalibreRow[];
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
  totalBulbs: number;
  rows: ReportCalibreRow[];
  lotes: ReportLote[];
}

export interface ReportPair {
  daily: ServiceReport;
  total: ServiceReport;
  dailyPdf: Buffer;
  totalPdf: Buffer;
  /** Un solo libro con el diario y el acumulado, para no multiplicar adjuntos. */
  workbook: Buffer;
}
