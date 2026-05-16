export interface LoteOption {
  id: string;
  codigoLote: string | null;
  variedadId: string | null;
  variedadNombre: string | null;
  variedadTipo: string | null;
  productoId: string | null;
  productoNombre: string | null;
  etapaActualId: string | null;
  etapaActual: string | null;
  servicioActualId: string | null;
  servicioActual: string | null;
  totalBulbs: number;
  lastTs: string | null;
  firstTs: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface FacetOption {
  id: string;
  nombre: string;
  count: number;
}

export interface EvolucionStep {
  servicioId: string;
  servicioNombre: string;
  tipoProcesoNombre: string | null;
  procesoTemporada: string | null;
  asignadoAt: string;
  firstTs: string | null;
  lastTs: string | null;
  distribution: { calibre: number | null; count: number }[];
  stats: {
    totalCount: number;
    mean: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
  };
}

export interface ComparacionLote {
  loteId: string;
  codigoLote: string | null;
  distribution: { calibre: number | null; count: number }[];
  stats: {
    totalCount: number;
    mean: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
  };
}

export interface AnaliticaFiltersState {
  search: string;
  productoId: string;
  variedadId: string;
  tipoProcesoId: string;
  hideEmpty: boolean;
  activity: "todos" | "ultimos_7" | "ultimos_30";
}

export const COLORS = [
  "#06b6d4",
  "#6366f1",
  "#f97316",
  "#10b981",
  "#ec4899",
  "#eab308",
] as const;

export function displayLoteCode(lote: { codigoLote?: string | null }): string {
  return lote.codigoLote?.trim() || "Sin código";
}

export function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

export function relativeTimeEs(iso: string | null): string {
  if (!iso) return "Sin actividad";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return "ahora";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `hace ${d} d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo > 1 ? "es" : ""}`;
  const yr = Math.floor(d / 365);
  return `hace ${yr} año${yr > 1 ? "s" : ""}`;
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
