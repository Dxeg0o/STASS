"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CaliberChart,
  CaliberDataPoint,
  CaliberSeries,
} from "@/components/CaliberChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lote {
  id: string;
  fechaCreacion: string;
  variedadId?: string;
  variedadNombre?: string;
  productoNombre?: string;
}

interface DistributionResponse {
  data: CaliberDataPoint[];
  series: { loteId: string }[];
}

const SERIES_COLORS = [
  "#06b6d4",
  "#6366f1",
  "#f97316",
  "#10b981",
  "#ec4899",
  "#14b8a6",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalibresPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [activeLote, setActiveLote] = useState<Lote | null>(null);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLoteIds, setSelectedLoteIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [chartData, setChartData] = useState<CaliberDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"quantity" | "percentage">("quantity");

  // ── Fetch lotes + active lote ──────────────────────────────────────────────
  useEffect(() => {
    if (!servicioId) return;
    setLoadingLotes(true);

    Promise.all([
      fetch(`/api/lotes?servicioId=${servicioId}`),
      fetch(`/api/lotes/activity/last?servicioId=${servicioId}`),
    ])
      .then(async ([lotesRes, activeRes]) => {
        if (!lotesRes.ok || !activeRes.ok) {
          throw new Error("Error al cargar lotes");
        }
        const lotesData: Lote[] = await lotesRes.json();
        const activeData: Lote | null = await activeRes.json();
        setLotes(lotesData);
        setActiveLote(activeData);
        setSelectedLoteIds((prev) => {
          if (prev.length > 0) return prev;
          return activeData ? [activeData.id] : [];
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLotes(false));
  }, [servicioId]);

  // ── Fetch chart data when selection changes ────────────────────────────────
  useEffect(() => {
    if (!servicioId || selectedLoteIds.length === 0) {
      setChartData([]);
      return;
    }

    const urlParams = new URLSearchParams({ servicioId });
    selectedLoteIds.forEach((id) => urlParams.append("loteId", id));

    setLoadingChart(true);
    setError(null);

    fetch(`/api/stats/distribution?${urlParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar la distribución");
        return (await res.json()) as DistributionResponse;
      })
      .then((payload) => setChartData(payload.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingChart(false));
  }, [servicioId, selectedLoteIds]);

  // ── Derived: filtered lotes ────────────────────────────────────────────────
  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter((l) => l.id.toLowerCase().includes(term));
  }, [lotes, search]);

  // ── Derived: chart series ──────────────────────────────────────────────────
  const series = useMemo<CaliberSeries[]>(() => {
    return selectedLoteIds.map((id, index) => {
      return {
        key: id,
        label: `Lote ${id.slice(-8)}`,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      };
    });
  }, [selectedLoteIds, lotes]);

  // ── Derived: totals for percentage mode ───────────────────────────────────
  const loteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedLoteIds.forEach((id) => {
      totals[id] = 0;
    });
    chartData.forEach((point) => {
      selectedLoteIds.forEach((id) => {
        if (typeof point[id] === "number") totals[id] += point[id];
      });
    });
    return totals;
  }, [chartData, selectedLoteIds]);

  const displayData = useMemo(() => {
    if (viewMode === "quantity") return chartData;
    return chartData.map((point) => {
      const newPoint: CaliberDataPoint = { perimeter: point.perimeter };
      selectedLoteIds.forEach((id) => {
        const val = point[id];
        const total = loteTotals[id];
        newPoint[id] =
          typeof val === "number" && total > 0 ? (val / total) * 100 : 0;
      });
      return newPoint;
    });
  }, [chartData, viewMode, selectedLoteIds, loteTotals]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleLote = (loteId: string) => {
    setSelectedLoteIds((prev) =>
      prev.includes(loteId)
        ? prev.filter((id) => id !== loteId)
        : [...prev, loteId]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Distribución de calibres</h1>
        <p className="text-sm text-slate-500">
          Visualiza la distribución de perímetros por lote con precisión de 0.1.
        </p>
      </div>

      {/* Active lote indicator */}
      {activeLote && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/40 bg-green-950/20 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-sm text-slate-300">
            Lote activo:{" "}
            <span className="font-semibold text-white font-mono">{activeLote.id.slice(-8)}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLoteIds([activeLote.id])}
            className="ml-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 h-7 px-2 text-xs"
          >
            Seleccionar
          </Button>
        </div>
      )}

      {/* Filters card */}
      <Card className="border-white/10 bg-slate-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar lote…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLoteIds([])}
              disabled={selectedLoteIds.length === 0}
              className="border-white/20 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Limpiar selección
            </Button>
            {activeLote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLoteIds([activeLote.id])}
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
              >
                Usar lote activo
              </Button>
            )}
          </div>

          {/* Lote list */}
          <div className="rounded-lg border border-white/10 bg-slate-800/20">
            <ScrollArea className="h-56">
              {loadingLotes ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-40 bg-slate-700/60" />
                  <Skeleton className="h-6 w-52 bg-slate-700/60" />
                  <Skeleton className="h-6 w-32 bg-slate-700/60" />
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLotes.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No se encontraron lotes.
                    </p>
                  ) : (
                    filteredLotes.map((lote) => {
                      const isChecked = selectedLoteIds.includes(lote.id);
                      const isActive = activeLote?.id === lote.id;
                      return (
                        <label
                          key={lote.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 cursor-pointer transition hover:border-white/10 hover:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-cyan-500 shrink-0"
                              checked={isChecked}
                              onChange={() => toggleLote(lote.id)}
                            />
                            <span className="text-sm font-medium text-white truncate">
                              {lote.id.slice(-8)}
                            </span>
                            {lote.variedadNombre && (
                              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs shrink-0">
                                {lote.variedadNombre}
                              </Badge>
                            )}
                          </div>
                          {isActive && (
                            <Badge
                              variant="outline"
                              className="border-green-500/40 text-green-400 shrink-0"
                            >
                              Activo
                            </Badge>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          <p className="text-xs text-slate-500">
            {selectedLoteIds.length === 0
              ? "Selecciona al menos un lote para ver la distribución."
              : `${selectedLoteIds.length} lote${selectedLoteIds.length !== 1 ? "s" : ""} seleccionado${selectedLoteIds.length !== 1 ? "s" : ""}`}
          </p>
        </CardContent>
      </Card>

      {/* Chart card */}
      <Card className="border-white/10 bg-slate-900/40">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-white">Distribución por calibre</CardTitle>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "quantity" | "percentage")}
            className="w-[180px]"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 border border-white/10">
              <TabsTrigger
                value="quantity"
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400 text-xs"
              >
                Cantidad
              </TabsTrigger>
              <TabsTrigger
                value="percentage"
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400 text-xs"
              >
                %
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}
          {loadingChart ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48 bg-slate-700/60" />
              <Skeleton className="h-[360px] w-full bg-slate-700/60" />
            </div>
          ) : selectedLoteIds.length === 0 ? (
            <p className="text-sm text-slate-500">
              Selecciona uno o más lotes para graficar.
            </p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay datos disponibles para los filtros seleccionados.
            </p>
          ) : (
            <CaliberChart
              data={displayData}
              series={series}
              yAxisTickFormatter={(val) =>
                viewMode === "percentage"
                  ? `${val.toFixed(0)}%`
                  : val.toLocaleString("es-CL")
              }
              tooltipValueFormatter={(val) =>
                viewMode === "percentage"
                  ? `${val.toFixed(2)}%`
                  : val.toLocaleString("es-CL")
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
