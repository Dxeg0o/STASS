import { db } from "@/db";
import {
  lote,
  loteServicio,
  loteTotalStats,
  loteSession,
  servicio,
  variedad,
  producto,
  proceso,
  tipoProceso,
  subvariedad,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

const SORT_FIELDS = [
  "codigoLote",
  "producto",
  "variedad",
  "etapa",
  "totalBulbs",
  "createdAt",
  "lastTs",
  "estado",
] as const;

export type LoteSortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";
export type EstadoFilter = "todos" | "activo" | "inactivo";
export type ActivityFilter =
  | "todos"
  | "con_datos"
  | "sin_datos"
  | "ultimos_7"
  | "ultimos_30";

export interface GlobalLotesQuery {
  empresaId: string;
  search?: string;
  productoId?: string;
  variedadId?: string;
  subvariedadId?: string;
  estado: EstadoFilter;
  tipoProcesoId?: string;
  servicioId?: string;
  createdFrom?: string;
  createdTo?: string;
  activity: ActivityFilter;
  minBulbs?: number;
  maxBulbs?: number;
  sort: LoteSortField;
  order: SortOrder;
  page: number;
  limit: number;
}

interface StatsByLote {
  totalBulbs: number;
  firstTs: Date | null;
  lastTs: Date | null;
}

interface LatestAssignment {
  servicioId: string;
  servicioNombre: string;
  tipoProcesoId: string | null;
  tipoProcesoNombre: string | null;
}

export interface LoteGlobalRow {
  id: string;
  codigoLote: string | null;
  createdAt: string | null;
  variedadId: string | null;
  variedadNombre: string | null;
  variedadTipo: string | null;
  subvariedadId: string | null;
  subvariedadNombre: string | null;
  productoId: string | null;
  productoNombre: string | null;
  totalBulbs: number;
  firstTs: string | null;
  lastTs: string | null;
  isActive: boolean;
  etapaActualId: string | null;
  etapaActual: string | null;
  servicioActualId: string | null;
  servicioActual: string | null;
}

export interface LoteFacetOption {
  id: string;
  nombre: string;
  count: number;
}

export interface LoteVariedadFacetOption extends LoteFacetOption {
  productoId: string | null;
  productoNombre: string | null;
  tipo: string | null;
}

export interface LoteGlobalFacets {
  productos: LoteFacetOption[];
  variedades: LoteVariedadFacetOption[];
  subvariedades: Array<LoteFacetOption & { variedadId: string | null }>;
  etapas: LoteFacetOption[];
  servicios: Array<LoteFacetOption & { tipoProcesoId: string | null }>;
}

export interface LoteGlobalSummary {
  allTotal: number;
  total: number;
  active: number;
  inactive: number;
  withData: number;
  withoutData: number;
  recent7: number;
  totalBulbs: number;
  lastActivity: string | null;
}

export interface GlobalLotesPayload {
  data: LoteGlobalRow[];
  total: number;
  page: number;
  limit: number;
  summary: LoteGlobalSummary;
  facets: LoteGlobalFacets;
}

function readTextParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)?.trim();
  return value || undefined;
}

function readNumberParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isSortField(value: string | null): value is LoteSortField {
  return SORT_FIELDS.includes(value as LoteSortField);
}

function isEstadoFilter(value: string | null): value is EstadoFilter {
  return value === "activo" || value === "inactivo" || value === "todos";
}

function isActivityFilter(value: string | null): value is ActivityFilter {
  return (
    value === "con_datos" ||
    value === "sin_datos" ||
    value === "ultimos_7" ||
    value === "ultimos_30" ||
    value === "todos"
  );
}

export function parseGlobalLotesQuery(
  searchParams: URLSearchParams
): GlobalLotesQuery | null {
  const empresaId = readTextParam(searchParams, "empresaId");
  if (!empresaId) return null;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10))
  );
  const rawSort = searchParams.get("sort");
  const rawOrder = searchParams.get("order");
  const rawEstado = searchParams.get("estado");
  const rawActivity = searchParams.get("activity");

  return {
    empresaId,
    search: readTextParam(searchParams, "search"),
    productoId: readTextParam(searchParams, "productoId"),
    variedadId: readTextParam(searchParams, "variedadId"),
    subvariedadId: readTextParam(searchParams, "subvariedadId"),
    estado: isEstadoFilter(rawEstado) ? rawEstado : "todos",
    tipoProcesoId: readTextParam(searchParams, "tipoProcesoId"),
    servicioId: readTextParam(searchParams, "servicioId"),
    createdFrom: readTextParam(searchParams, "createdFrom"),
    createdTo: readTextParam(searchParams, "createdTo"),
    activity: isActivityFilter(rawActivity) ? rawActivity : "todos",
    minBulbs: readNumberParam(searchParams, "minBulbs"),
    maxBulbs: readNumberParam(searchParams, "maxBulbs"),
    sort: isSortField(rawSort) ? rawSort : "createdAt",
    order: rawOrder === "asc" ? "asc" : "desc",
    page,
    limit,
  };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function compareNullableText(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "es");
}

function compareNullableDate(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function addFacetCount<T extends { count: number }>(
  map: Map<string, T>,
  id: string | null | undefined
) {
  if (!id) return;
  const item = map.get(id);
  if (item) item.count += 1;
}

function buildFacets(rows: LoteGlobalRow[]): LoteGlobalFacets {
  const productos = new Map<string, LoteFacetOption>();
  const variedades = new Map<string, LoteVariedadFacetOption>();
  const subvariedades = new Map<
    string,
    LoteFacetOption & { variedadId: string | null }
  >();
  const etapas = new Map<string, LoteFacetOption>();
  const servicios = new Map<
    string,
    LoteFacetOption & { tipoProcesoId: string | null }
  >();

  for (const row of rows) {
    if (row.productoId && !productos.has(row.productoId)) {
      productos.set(row.productoId, {
        id: row.productoId,
        nombre: row.productoNombre ?? "Sin producto",
        count: 0,
      });
    }
    if (row.variedadId && !variedades.has(row.variedadId)) {
      variedades.set(row.variedadId, {
        id: row.variedadId,
        nombre: row.variedadNombre ?? "Sin variedad",
        count: 0,
        productoId: row.productoId,
        productoNombre: row.productoNombre,
        tipo: row.variedadTipo,
      });
    }
    if (row.subvariedadId && !subvariedades.has(row.subvariedadId)) {
      subvariedades.set(row.subvariedadId, {
        id: row.subvariedadId,
        nombre: row.subvariedadNombre ?? "Sin subvariedad",
        count: 0,
        variedadId: row.variedadId,
      });
    }
    if (row.etapaActualId && !etapas.has(row.etapaActualId)) {
      etapas.set(row.etapaActualId, {
        id: row.etapaActualId,
        nombre: row.etapaActual ?? "Sin etapa",
        count: 0,
      });
    }
    if (row.servicioActualId && !servicios.has(row.servicioActualId)) {
      servicios.set(row.servicioActualId, {
        id: row.servicioActualId,
        nombre: row.servicioActual ?? "Sin servicio",
        count: 0,
        tipoProcesoId: row.etapaActualId,
      });
    }

    addFacetCount(productos, row.productoId);
    addFacetCount(variedades, row.variedadId);
    addFacetCount(subvariedades, row.subvariedadId);
    addFacetCount(etapas, row.etapaActualId);
    addFacetCount(servicios, row.servicioActualId);
  }

  const sortByName = <T extends { nombre: string }>(a: T, b: T) =>
    a.nombre.localeCompare(b.nombre, "es");

  return {
    productos: Array.from(productos.values()).sort(sortByName),
    variedades: Array.from(variedades.values()).sort(sortByName),
    subvariedades: Array.from(subvariedades.values()).sort(sortByName),
    etapas: Array.from(etapas.values()).sort(sortByName),
    servicios: Array.from(servicios.values()).sort(sortByName),
  };
}

function buildSummary(rows: LoteGlobalRow[], allTotal: number): LoteGlobalSummary {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastActivity = rows.reduce<string | null>((latest, row) => {
    if (!row.lastTs) return latest;
    if (!latest) return row.lastTs;
    return new Date(row.lastTs).getTime() > new Date(latest).getTime()
      ? row.lastTs
      : latest;
  }, null);

  return {
    allTotal,
    total: rows.length,
    active: rows.filter((row) => row.isActive).length,
    inactive: rows.filter((row) => !row.isActive).length,
    withData: rows.filter((row) => row.totalBulbs > 0 || row.lastTs).length,
    withoutData: rows.filter((row) => row.totalBulbs === 0 && !row.lastTs).length,
    recent7: rows.filter(
      (row) => row.lastTs && new Date(row.lastTs).getTime() >= sevenDaysAgo
    ).length,
    totalBulbs: rows.reduce((sum, row) => sum + row.totalBulbs, 0),
    lastActivity,
  };
}

function passesFilters(row: LoteGlobalRow, query: GlobalLotesQuery) {
  if (query.productoId && row.productoId !== query.productoId) return false;
  if (query.variedadId && row.variedadId !== query.variedadId) return false;
  if (query.subvariedadId && row.subvariedadId !== query.subvariedadId) {
    return false;
  }
  if (query.tipoProcesoId && row.etapaActualId !== query.tipoProcesoId) {
    return false;
  }
  if (query.servicioId && row.servicioActualId !== query.servicioId) {
    return false;
  }
  if (query.estado === "activo" && !row.isActive) return false;
  if (query.estado === "inactivo" && row.isActive) return false;
  if (query.minBulbs !== undefined && row.totalBulbs < query.minBulbs) {
    return false;
  }
  if (query.maxBulbs !== undefined && row.totalBulbs > query.maxBulbs) {
    return false;
  }

  const created = row.createdAt ? new Date(row.createdAt) : null;
  const createdFrom = parseDateBoundary(query.createdFrom);
  const createdTo = parseDateBoundary(query.createdTo, true);
  if (createdFrom && (!created || created < createdFrom)) return false;
  if (createdTo && (!created || created > createdTo)) return false;

  if (query.activity === "con_datos" && row.totalBulbs === 0 && !row.lastTs) {
    return false;
  }
  if (query.activity === "sin_datos" && (row.totalBulbs > 0 || row.lastTs)) {
    return false;
  }
  if (query.activity === "ultimos_7" || query.activity === "ultimos_30") {
    const days = query.activity === "ultimos_7" ? 7 : 30;
    const minTime = Date.now() - days * 24 * 60 * 60 * 1000;
    if (!row.lastTs || new Date(row.lastTs).getTime() < minTime) return false;
  }

  if (query.search) {
    const term = normalize(query.search);
    const haystack = normalize([
      row.codigoLote,
      row.id,
      row.productoNombre,
      row.variedadNombre,
      row.variedadTipo,
      row.subvariedadNombre,
      row.etapaActual,
      row.servicioActual,
    ].join(" "));
    if (!haystack.includes(term)) return false;
  }

  return true;
}

function sortRows(rows: LoteGlobalRow[], query: GlobalLotesQuery) {
  const direction = query.order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let result = 0;
    switch (query.sort) {
      case "codigoLote":
        result = compareNullableText(a.codigoLote, b.codigoLote);
        break;
      case "producto":
        result = compareNullableText(a.productoNombre, b.productoNombre);
        break;
      case "variedad":
        result = compareNullableText(a.variedadNombre, b.variedadNombre);
        break;
      case "etapa":
        result = compareNullableText(a.etapaActual, b.etapaActual);
        break;
      case "totalBulbs":
        result = a.totalBulbs - b.totalBulbs;
        break;
      case "lastTs":
        result = compareNullableDate(a.lastTs, b.lastTs);
        break;
      case "estado":
        result = Number(a.isActive) - Number(b.isActive);
        break;
      case "createdAt":
      default:
        result = compareNullableDate(a.createdAt, b.createdAt);
        break;
    }

    if (result === 0) {
      result = compareNullableDate(a.createdAt, b.createdAt);
    }
    return result * direction;
  });
}

export async function getGlobalLotesPayload(
  query: GlobalLotesQuery,
  options: { paginate?: boolean } = { paginate: true }
): Promise<GlobalLotesPayload> {
  const servicios = await db
    .select({ id: servicio.id })
    .from(servicio)
    .where(eq(servicio.empresaId, query.empresaId));
  const servicioIds = servicios.map((s) => s.id);

  if (servicioIds.length === 0) {
    const emptySummary = buildSummary([], 0);
    return {
      data: [],
      total: 0,
      page: query.page,
      limit: query.limit,
      summary: emptySummary,
      facets: buildFacets([]),
    };
  }

  const loteLinks = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(inArray(loteServicio.servicioId, servicioIds));
  const uniqueLoteIds = [...new Set(loteLinks.map((link) => link.loteId))];

  if (uniqueLoteIds.length === 0) {
    const emptySummary = buildSummary([], 0);
    return {
      data: [],
      total: 0,
      page: query.page,
      limit: query.limit,
      summary: emptySummary,
      facets: buildFacets([]),
    };
  }

  const baseRows = await db
    .select({
      id: lote.id,
      codigoLote: lote.codigoLote,
      createdAt: lote.createdAt,
      variedadId: lote.variedadId,
      variedadNombre: variedad.nombre,
      variedadTipo: variedad.tipo,
      subvariedadId: lote.subvariedadId,
      subvariedadNombre: subvariedad.nombre,
      productoId: producto.id,
      productoNombre: producto.nombre,
    })
    .from(lote)
    .leftJoin(variedad, eq(variedad.id, lote.variedadId))
    .leftJoin(subvariedad, eq(subvariedad.id, lote.subvariedadId))
    .leftJoin(producto, eq(producto.id, variedad.productoId))
    .where(inArray(lote.id, uniqueLoteIds));

  const statsRows = await db
    .select({
      loteId: loteTotalStats.loteId,
      totalBulbs: sql<number>`COALESCE(SUM(${loteTotalStats.countIn} + ${loteTotalStats.countOut}), 0)::int`,
      firstTs: sql<Date | null>`MIN(${loteTotalStats.firstTs})`,
      lastTs: sql<Date | null>`MAX(${loteTotalStats.lastTs})`,
    })
    .from(loteTotalStats)
    .where(inArray(loteTotalStats.loteId, uniqueLoteIds))
    .groupBy(loteTotalStats.loteId);

  const activeRows = await db
    .select({ loteId: loteSession.loteId })
    .from(loteSession)
    .where(
      and(inArray(loteSession.loteId, uniqueLoteIds), isNull(loteSession.endTime))
    );

  const assignmentRows = await db
    .select({
      loteId: loteServicio.loteId,
      asignadoAt: loteServicio.asignadoAt,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      tipoProcesoId: tipoProceso.id,
      tipoProcesoNombre: tipoProceso.nombre,
    })
    .from(loteServicio)
    .innerJoin(servicio, eq(servicio.id, loteServicio.servicioId))
    .leftJoin(proceso, eq(proceso.id, servicio.procesoId))
    .leftJoin(tipoProceso, eq(tipoProceso.id, proceso.tipoProcesoId))
    .where(inArray(loteServicio.loteId, uniqueLoteIds))
    .orderBy(desc(loteServicio.asignadoAt));

  const statsByLote = new Map<string, StatsByLote>();
  for (const row of statsRows) {
    statsByLote.set(row.loteId, {
      totalBulbs: Number(row.totalBulbs) || 0,
      firstTs: row.firstTs,
      lastTs: row.lastTs,
    });
  }

  const activeLoteIds = new Set(activeRows.map((row) => row.loteId));
  const latestByLote = new Map<string, LatestAssignment>();
  for (const row of assignmentRows) {
    if (!latestByLote.has(row.loteId)) {
      latestByLote.set(row.loteId, {
        servicioId: row.servicioId,
        servicioNombre: row.servicioNombre,
        tipoProcesoId: row.tipoProcesoId,
        tipoProcesoNombre: row.tipoProcesoNombre,
      });
    }
  }

  const allRows: LoteGlobalRow[] = baseRows.map((row) => {
    const stats = statsByLote.get(row.id);
    const latest = latestByLote.get(row.id);
    return {
      id: row.id,
      codigoLote: row.codigoLote,
      createdAt: toIso(row.createdAt),
      variedadId: row.variedadId,
      variedadNombre: row.variedadNombre,
      variedadTipo: row.variedadTipo,
      subvariedadId: row.subvariedadId,
      subvariedadNombre: row.subvariedadNombre,
      productoId: row.productoId,
      productoNombre: row.productoNombre,
      totalBulbs: stats?.totalBulbs ?? 0,
      firstTs: toIso(stats?.firstTs),
      lastTs: toIso(stats?.lastTs),
      isActive: activeLoteIds.has(row.id),
      etapaActualId: latest?.tipoProcesoId ?? null,
      etapaActual: latest?.tipoProcesoNombre ?? null,
      servicioActualId: latest?.servicioId ?? null,
      servicioActual: latest?.servicioNombre ?? null,
    };
  });

  const facets = buildFacets(allRows);
  const filteredRows = allRows.filter((row) => passesFilters(row, query));
  const sortedRows = sortRows(filteredRows, query);
  const total = sortedRows.length;
  const offset = (query.page - 1) * query.limit;
  const data = options.paginate === false
    ? sortedRows
    : sortedRows.slice(offset, offset + query.limit);

  return {
    data,
    total,
    page: query.page,
    limit: query.limit,
    summary: buildSummary(filteredRows, allRows.length),
    facets,
  };
}
