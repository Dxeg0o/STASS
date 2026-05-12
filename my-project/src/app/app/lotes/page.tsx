"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as XLSX from "xlsx";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

type SortField =
  | "codigoLote"
  | "producto"
  | "variedad"
  | "etapa"
  | "totalBulbs"
  | "createdAt"
  | "lastTs"
  | "estado";
type SortOrder = "asc" | "desc";
type EstadoFilter = "todos" | "activo" | "inactivo";
type ActivityFilter =
  | "todos"
  | "con_datos"
  | "sin_datos"
  | "ultimos_7"
  | "ultimos_30";

interface LoteRow {
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

interface FacetOption {
  id: string;
  nombre: string;
  count: number;
}

interface VariedadFacetOption extends FacetOption {
  productoId: string | null;
  productoNombre: string | null;
  tipo: string | null;
}

interface Facets {
  productos: FacetOption[];
  variedades: VariedadFacetOption[];
  subvariedades: Array<FacetOption & { variedadId: string | null }>;
  etapas: FacetOption[];
  servicios: Array<FacetOption & { tipoProcesoId: string | null }>;
}

interface Summary {
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

interface LotesResponse {
  data: LoteRow[];
  total: number;
  page: number;
  limit: number;
  summary: Summary;
  facets: Facets;
}

interface Filters {
  search: string;
  productoId: string;
  variedadId: string;
  subvariedadId: string;
  estado: EstadoFilter;
  tipoProcesoId: string;
  servicioId: string;
  createdFrom: string;
  createdTo: string;
  activity: ActivityFilter;
  minBulbs: string;
  maxBulbs: string;
  sort: SortField;
  order: SortOrder;
  page: number;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  productoId: "",
  variedadId: "",
  subvariedadId: "",
  estado: "todos",
  tipoProcesoId: "",
  servicioId: "",
  createdFrom: "",
  createdTo: "",
  activity: "todos",
  minBulbs: "",
  maxBulbs: "",
  sort: "createdAt",
  order: "desc",
  page: 1,
};

const EMPTY_FACETS: Facets = {
  productos: [],
  variedades: [],
  subvariedades: [],
  etapas: [],
  servicios: [],
};

const EMPTY_SUMMARY: Summary = {
  allTotal: 0,
  total: 0,
  active: 0,
  inactive: 0,
  withData: 0,
  withoutData: 0,
  recent7: 0,
  totalBulbs: 0,
  lastActivity: null,
};

const LIMIT = 25;

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayLote(lote: Pick<LoteRow, "codigoLote">): string {
  return lote.codigoLote?.trim() || "Sin codigo";
}

function parseUrlFilters(): Filters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const params = new URLSearchParams(window.location.search);
  const estado = params.get("estado");
  const activity = params.get("activity");
  const sort = params.get("sort");
  const order = params.get("order");
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  return {
    ...DEFAULT_FILTERS,
    search: params.get("search") ?? "",
    productoId: params.get("productoId") ?? "",
    variedadId: params.get("variedadId") ?? "",
    subvariedadId: params.get("subvariedadId") ?? "",
    estado:
      estado === "activo" || estado === "inactivo" || estado === "todos"
        ? estado
        : "todos",
    tipoProcesoId: params.get("tipoProcesoId") ?? "",
    servicioId: params.get("servicioId") ?? "",
    createdFrom: params.get("createdFrom") ?? "",
    createdTo: params.get("createdTo") ?? "",
    activity:
      activity === "con_datos" ||
      activity === "sin_datos" ||
      activity === "ultimos_7" ||
      activity === "ultimos_30" ||
      activity === "todos"
        ? activity
        : "todos",
    minBulbs: params.get("minBulbs") ?? "",
    maxBulbs: params.get("maxBulbs") ?? "",
    sort:
      sort === "codigoLote" ||
      sort === "producto" ||
      sort === "variedad" ||
      sort === "etapa" ||
      sort === "totalBulbs" ||
      sort === "createdAt" ||
      sort === "lastTs" ||
      sort === "estado"
        ? sort
        : "createdAt",
    order: order === "asc" ? "asc" : "desc",
    page,
  };
}

function setParamIfValue(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
}

function filtersToUrlParams(filters: Filters) {
  const params = new URLSearchParams();
  setParamIfValue(params, "search", filters.search);
  setParamIfValue(params, "productoId", filters.productoId);
  setParamIfValue(params, "variedadId", filters.variedadId);
  setParamIfValue(params, "subvariedadId", filters.subvariedadId);
  if (filters.estado !== "todos") params.set("estado", filters.estado);
  setParamIfValue(params, "tipoProcesoId", filters.tipoProcesoId);
  setParamIfValue(params, "servicioId", filters.servicioId);
  setParamIfValue(params, "createdFrom", filters.createdFrom);
  setParamIfValue(params, "createdTo", filters.createdTo);
  if (filters.activity !== "todos") params.set("activity", filters.activity);
  setParamIfValue(params, "minBulbs", filters.minBulbs);
  setParamIfValue(params, "maxBulbs", filters.maxBulbs);
  if (filters.sort !== "createdAt") params.set("sort", filters.sort);
  if (filters.order !== "desc") params.set("order", filters.order);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function getStatus(row: LoteRow) {
  if (row.isActive) {
    return {
      label: "Activo",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (row.totalBulbs === 0 && !row.lastTs) {
    return {
      label: "Sin datos",
      className: "border-slate-700 bg-slate-800/70 text-slate-400",
    };
  }
  return {
    label: "Inactivo",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function LotesPage() {
  const pathname = usePathname();
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  const [ready, setReady] = useState(false);
  const [lotes, setLotes] = useState<LoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  useEffect(() => {
    const urlFilters = parseUrlFilters();
    setFilters(urlFilters);
    setSearchInput(urlFilters.search);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput
          ? prev
          : { ...prev, search: searchInput, page: 1 }
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [ready, searchInput]);

  useEffect(() => {
    if (!ready) return;
    const params = filtersToUrlParams(filters);
    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [filters, pathname, ready]);

  const buildApiParams = useCallback(
    (forExport = false) => {
      const params = filtersToUrlParams(filters);
      params.set("empresaId", data?.empresaId ?? "");
      if (!forExport) {
        params.set("page", String(filters.page));
        params.set("limit", String(LIMIT));
      } else {
        params.delete("page");
      }
      return params;
    },
    [data?.empresaId, filters]
  );

  const apiQuery = useMemo(() => {
    if (!ready || !data?.empresaId) return "";
    return buildApiParams().toString();
  }, [buildApiParams, data?.empresaId, ready]);

  useEffect(() => {
    if (!apiQuery) return;
    setLoading(true);
    setError(null);

    fetch(`/api/lotes/global?${apiQuery}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar los lotes");
        return res.json() as Promise<LotesResponse>;
      })
      .then((json) => {
        setLotes(json.data);
        setTotal(json.total);
        setFacets(json.facets ?? EMPTY_FACETS);
        setSummary(json.summary ?? EMPTY_SUMMARY);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => setLoading(false));
  }, [apiQuery]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  }, []);

  const productById = useMemo(
    () => new Map(facets.productos.map((item) => [item.id, item])),
    [facets.productos]
  );
  const varietyById = useMemo(
    () => new Map(facets.variedades.map((item) => [item.id, item])),
    [facets.variedades]
  );
  const subvarietyById = useMemo(
    () => new Map(facets.subvariedades.map((item) => [item.id, item])),
    [facets.subvariedades]
  );
  const etapaById = useMemo(
    () => new Map(facets.etapas.map((item) => [item.id, item])),
    [facets.etapas]
  );
  const serviceById = useMemo(
    () => new Map(facets.servicios.map((item) => [item.id, item])),
    [facets.servicios]
  );

  const visibleVariedades = useMemo(() => {
    if (!filters.productoId) return facets.variedades;
    return facets.variedades.filter(
      (item) => item.productoId === filters.productoId
    );
  }, [facets.variedades, filters.productoId]);

  const visibleSubvariedades = useMemo(() => {
    if (!filters.variedadId) return facets.subvariedades;
    return facets.subvariedades.filter(
      (item) => item.variedadId === filters.variedadId
    );
  }, [facets.subvariedades, filters.variedadId]);

  const visibleServicios = useMemo(() => {
    if (!filters.tipoProcesoId) return facets.servicios;
    return facets.servicios.filter(
      (item) => item.tipoProcesoId === filters.tipoProcesoId
    );
  }, [facets.servicios, filters.tipoProcesoId]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (filters.search) {
      chips.push({
        key: "search",
        label: `Busqueda: ${filters.search}`,
        onRemove: () => {
          setSearchInput("");
          updateFilters({ search: "" });
        },
      });
    }
    if (filters.productoId) {
      chips.push({
        key: "producto",
        label: productById.get(filters.productoId)?.nombre ?? "Producto",
        onRemove: () =>
          updateFilters({ productoId: "", variedadId: "", subvariedadId: "" }),
      });
    }
    if (filters.variedadId) {
      chips.push({
        key: "variedad",
        label: varietyById.get(filters.variedadId)?.nombre ?? "Variedad",
        onRemove: () => updateFilters({ variedadId: "", subvariedadId: "" }),
      });
    }
    if (filters.subvariedadId) {
      chips.push({
        key: "subvariedad",
        label:
          subvarietyById.get(filters.subvariedadId)?.nombre ?? "Subvariedad",
        onRemove: () => updateFilters({ subvariedadId: "" }),
      });
    }
    if (filters.tipoProcesoId) {
      chips.push({
        key: "etapa",
        label: etapaById.get(filters.tipoProcesoId)?.nombre ?? "Etapa",
        onRemove: () => updateFilters({ tipoProcesoId: "", servicioId: "" }),
      });
    }
    if (filters.servicioId) {
      chips.push({
        key: "servicio",
        label: serviceById.get(filters.servicioId)?.nombre ?? "Servicio",
        onRemove: () => updateFilters({ servicioId: "" }),
      });
    }
    if (filters.createdFrom || filters.createdTo) {
      chips.push({
        key: "created",
        label: `Creado ${filters.createdFrom || "..."} - ${
          filters.createdTo || "..."
        }`,
        onRemove: () => updateFilters({ createdFrom: "", createdTo: "" }),
      });
    }
    if (filters.minBulbs || filters.maxBulbs) {
      chips.push({
        key: "bulbs",
        label: `Bulbos ${filters.minBulbs || "0"} - ${
          filters.maxBulbs || "sin limite"
        }`,
        onRemove: () => updateFilters({ minBulbs: "", maxBulbs: "" }),
      });
    }
    return chips;
  }, [
    etapaById,
    filters,
    productById,
    serviceById,
    subvarietyById,
    updateFilters,
    varietyById,
  ]);

  const hasActiveFilters =
    activeChips.length > 0 ||
    filters.estado !== "todos" ||
    filters.activity !== "todos";

  const setQuickFilter = (key: string) => {
    if (key === "todos") {
      updateFilters({ estado: "todos", activity: "todos" });
    }
    if (key === "activos") {
      updateFilters({ estado: "activo", activity: "todos" });
    }
    if (key === "con_datos") {
      updateFilters({ estado: "todos", activity: "con_datos" });
    }
    if (key === "sin_datos") {
      updateFilters({ estado: "todos", activity: "sin_datos" });
    }
    if (key === "ultimos_7") {
      updateFilters({ estado: "todos", activity: "ultimos_7" });
    }
  };

  const currentQuickFilter = useMemo(() => {
    if (filters.estado === "activo" && filters.activity === "todos") {
      return "activos";
    }
    if (filters.estado === "todos" && filters.activity === "con_datos") {
      return "con_datos";
    }
    if (filters.estado === "todos" && filters.activity === "sin_datos") {
      return "sin_datos";
    }
    if (filters.estado === "todos" && filters.activity === "ultimos_7") {
      return "ultimos_7";
    }
    if (filters.estado === "todos" && filters.activity === "todos") {
      return "todos";
    }
    return "";
  }, [filters.activity, filters.estado]);

  const handleSort = (field: SortField) => {
    setFilters((prev) => {
      if (prev.sort === field) {
        return {
          ...prev,
          order: prev.order === "asc" ? "desc" : "asc",
          page: 1,
        };
      }
      const defaultOrder =
        field === "codigoLote" || field === "producto" || field === "variedad"
          ? "asc"
          : "desc";
      return { ...prev, sort: field, order: defaultOrder, page: 1 };
    });
  };

  const fetchExportRows = async () => {
    setExporting(true);
    try {
      const params = buildApiParams(true);
      const res = await fetch(`/api/lotes/global/export?${params.toString()}`);
      if (!res.ok) throw new Error("Error al exportar lotes");
      const json: { data: LoteRow[] } = await res.json();
      return json.data;
    } finally {
      setExporting(false);
    }
  };

  const toExportRows = (rows: LoteRow[]) =>
    rows.map((row) => ({
      Codigo: displayLote(row),
      Producto: row.productoNombre ?? "",
      Variedad: row.variedadNombre ?? "",
      Subvariedad: row.subvariedadNombre ?? "",
      Etapa: row.etapaActual ?? "",
      Servicio: row.servicioActual ?? "",
      Estado: getStatus(row).label,
      Bulbos: row.totalBulbs,
      Creado: formatDate(row.createdAt),
      "Primera actividad": formatDateTime(row.firstTs),
      "Ultima actividad": formatDateTime(row.lastTs),
      ID: row.id,
    }));

  const exportCsv = async () => {
    try {
      const rows = toExportRows(await fetchExportRows());
      const headers = Object.keys(rows[0] ?? { Codigo: "" });
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((header) => csvEscape(row[header as keyof typeof row])).join(",")
        ),
      ].join("\n");
      const blob = new Blob(["\ufeff", csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lotes-filtrados.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar CSV");
    }
  };

  const exportXlsx = async () => {
    try {
      const rows = toExportRows(await fetchExportRows());
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Lotes");
      XLSX.writeFile(workbook, "lotes-filtrados.xlsx");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar XLSX");
    }
  };

  const SortButton = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = filters.sort === field;
    const Icon = !active ? ArrowUpDown : filters.order === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300 ${className}`}
      >
        {children}
        <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : ""}`} />
      </button>
    );
  };

  if (authLoading || !ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-slate-400 animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-slate-400">No estas autenticado.</div>
      </div>
    );
  }

  const quickFilters = [
    { key: "todos", label: "Todos", count: summary.allTotal },
    { key: "activos", label: "Activos", count: summary.active },
    { key: "con_datos", label: "Con datos", count: summary.withData },
    { key: "sin_datos", label: "Sin datos", count: summary.withoutData },
    { key: "ultimos_7", label: "Ultimos 7 dias", count: summary.recent7 },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Lotes</h1>
          <p className="mt-1 text-sm text-slate-400">
            {data.empresaNombre ?? "Empresa"} · vista operacional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || summary.total === 0}
            onClick={exportCsv}
            className="border-white/10 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || summary.total === 0}
            onClick={exportXlsx}
            className="border-white/10 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Download className="h-4 w-4" />
            XLSX
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-900/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Lotes</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatNumber(summary.total)}
            <span className="ml-2 text-xs font-normal text-slate-500">
              de {formatNumber(summary.allTotal)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Activos</p>
          <p className="mt-1 text-xl font-semibold text-emerald-300">
            {formatNumber(summary.active)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Bulbos</p>
          <p className="mt-1 text-xl font-semibold text-cyan-300">
            {formatNumber(summary.totalBulbs)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Ultima actividad
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-300">
            {formatDateTime(summary.lastActivity)}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/25 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar codigo, producto, variedad, etapa o servicio..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-10 border-white/10 bg-slate-900/60 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {quickFilters.map((item) => {
              const active = currentQuickFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setQuickFilter(item.key)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span className="ml-2 text-slate-500">
                    {formatNumber(item.count)}
                  </span>
                </button>
              );
            })}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 shrink-0 border-white/10 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(92vw,560px)] border-white/10 bg-slate-900 p-4 text-white shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Filtros avanzados</p>
                  <p className="text-xs text-slate-500">
                    Refina por variedad, proceso, fechas y volumen.
                  </p>
                </div>
                <Filter className="h-4 w-4 text-slate-500" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Producto
                  </label>
                  <Select
                    value={filters.productoId || "all"}
                    onValueChange={(value) =>
                      updateFilters({
                        productoId: value === "all" ? "" : value,
                        variedadId: "",
                        subvariedadId: "",
                      })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {facets.productos.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nombre} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Variedad
                  </label>
                  <Select
                    value={filters.variedadId || "all"}
                    onValueChange={(value) =>
                      updateFilters({
                        variedadId: value === "all" ? "" : value,
                        subvariedadId: "",
                      })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="all">Todas</SelectItem>
                      {visibleVariedades.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.tipo ? `${item.tipo} · ` : ""}
                          {item.nombre} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Subvariedad
                  </label>
                  <Select
                    value={filters.subvariedadId || "all"}
                    onValueChange={(value) =>
                      updateFilters({
                        subvariedadId: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="all">Todas</SelectItem>
                      {visibleSubvariedades.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nombre} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Estado
                  </label>
                  <Select
                    value={filters.estado}
                    onValueChange={(value) =>
                      updateFilters({ estado: value as EstadoFilter })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Etapa actual
                  </label>
                  <Select
                    value={filters.tipoProcesoId || "all"}
                    onValueChange={(value) =>
                      updateFilters({
                        tipoProcesoId: value === "all" ? "" : value,
                        servicioId: "",
                      })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="all">Todas</SelectItem>
                      {facets.etapas.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nombre} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Servicio actual
                  </label>
                  <Select
                    value={filters.servicioId || "all"}
                    onValueChange={(value) =>
                      updateFilters({ servicioId: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      <SelectItem value="all">Todos</SelectItem>
                      {visibleServicios.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nombre} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Creado desde
                  </label>
                  <Input
                    type="date"
                    value={filters.createdFrom}
                    onChange={(event) =>
                      updateFilters({ createdFrom: event.target.value })
                    }
                    className="border-white/10 bg-slate-800 text-white focus-visible:ring-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Creado hasta
                  </label>
                  <Input
                    type="date"
                    value={filters.createdTo}
                    onChange={(event) =>
                      updateFilters({ createdTo: event.target.value })
                    }
                    className="border-white/10 bg-slate-800 text-white focus-visible:ring-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Min. bulbos
                  </label>
                  <Input
                    inputMode="numeric"
                    value={filters.minBulbs}
                    onChange={(event) =>
                      updateFilters({ minBulbs: event.target.value })
                    }
                    placeholder="0"
                    className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Max. bulbos
                  </label>
                  <Input
                    inputMode="numeric"
                    value={filters.maxBulbs}
                    onChange={(event) =>
                      updateFilters({ maxBulbs: event.target.value })
                    }
                    placeholder="Sin limite"
                    className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              className="h-10 shrink-0 text-slate-400 hover:bg-white/5 hover:text-white"
              onClick={clearFilters}
            >
              Limpiar
            </Button>
          )}
        </div>

        {(activeChips.length > 0 ||
          filters.estado !== "todos" ||
          filters.activity !== "todos") && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.estado !== "todos" && (
              <Badge className="shrink-0 gap-1 border-cyan-500/25 bg-cyan-500/10 text-cyan-200">
                {filters.estado === "activo" ? "Activo" : "Inactivo"}
                <button onClick={() => updateFilters({ estado: "todos" })}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.activity !== "todos" && (
              <Badge className="shrink-0 gap-1 border-cyan-500/25 bg-cyan-500/10 text-cyan-200">
                {filters.activity === "con_datos" && "Con datos"}
                {filters.activity === "sin_datos" && "Sin datos"}
                {filters.activity === "ultimos_7" && "Ultimos 7 dias"}
                {filters.activity === "ultimos_30" && "Ultimos 30 dias"}
                <button onClick={() => updateFilters({ activity: "todos" })}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                className="shrink-0 gap-1 border-white/10 bg-slate-800/80 text-slate-300"
              >
                {chip.label}
                <button onClick={chip.onRemove}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <Card className="border-white/10 bg-slate-900/40">
          <CardContent className="p-0">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse border-b border-white/5 bg-slate-900/20"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && lotes.length > 0 && (
        <Card className="overflow-hidden border-white/10 bg-slate-900/40">
          <CardContent className="p-0">
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur">
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 text-left">
                      <SortButton field="codigoLote">Codigo lote</SortButton>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortButton field="variedad">Variedad</SortButton>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortButton field="producto">Producto</SortButton>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortButton field="etapa">Etapa</SortButton>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <SortButton field="totalBulbs" className="ml-auto">
                        Bulbos
                      </SortButton>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <SortButton field="lastTs" className="ml-auto">
                        Ultima actividad
                      </SortButton>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <SortButton field="createdAt" className="ml-auto">
                        Creado
                      </SortButton>
                    </th>
                    <th className="px-5 py-3 text-center">
                      <SortButton field="estado">Estado</SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {lotes.map((loteRow) => {
                    const status = getStatus(loteRow);
                    return (
                      <tr
                        key={loteRow.id}
                        className="group transition-colors hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/app/lotes/${loteRow.id}`}
                            className="font-mono text-xs font-medium text-slate-100 transition-colors hover:text-cyan-300"
                          >
                            {displayLote(loteRow)}
                          </Link>
                          <p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-600">
                            {loteRow.id}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {loteRow.variedadNombre ? (
                            <div className="space-y-1">
                              <div>
                                {loteRow.variedadTipo && (
                                  <span className="mr-1 text-xs text-slate-500">
                                    {loteRow.variedadTipo}
                                  </span>
                                )}
                                {loteRow.variedadNombre}
                              </div>
                              {loteRow.subvariedadNombre && (
                                <p className="text-xs text-slate-500">
                                  {loteRow.subvariedadNombre}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400">
                          {loteRow.productoNombre ?? (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {loteRow.etapaActual ? (
                              <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                                {loteRow.etapaActual}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                            {loteRow.servicioActual && (
                              <p className="text-xs text-slate-500">
                                {loteRow.servicioActual}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold text-cyan-200">
                            {formatNumber(loteRow.totalBulbs)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-400">
                          {formatDateTime(loteRow.lastTs)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500">
                          {formatDate(loteRow.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge className={status.className}>
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && lotes.length === 0 && !error && (
        <div className="rounded-lg border border-white/10 bg-slate-900/30 py-16 text-center text-slate-500">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <p className="text-lg font-medium text-slate-300">
            No se encontraron lotes
          </p>
          <p className="mt-1 text-sm">
            {hasActiveFilters
              ? "Ajusta la busqueda o limpia los filtros activos."
              : "No hay lotes registrados para esta empresa."}
          </p>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Mostrando {(filters.page - 1) * LIMIT + 1}-
            {Math.min(filters.page * LIMIT, total)} de {formatNumber(total)} lotes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              disabled={filters.page === 1}
              className="border-white/10 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-20 text-center text-sm text-slate-400">
              {filters.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min(totalPages, prev.page + 1),
                }))
              }
              disabled={filters.page === totalPages}
              className="border-white/10 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
