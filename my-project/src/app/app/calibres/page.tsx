"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { useServicio } from "@/app/context/ServicioContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { CaliberChart, CaliberDataPoint, CaliberSeries } from "@/components/CaliberChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";



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

export default function CalibresPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const { selectedServicio } = useServicio();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [activeLote, setActiveLote] = useState<Lote | null>(null);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLoteIds, setSelectedLoteIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [chartData, setChartData] = useState<CaliberDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"quantity" | "percentage">("quantity");

  useEffect(() => {
    // ... set chartData logic remains same ...
    if (!data || !selectedServicio) return;

    setLoadingLotes(true);
    Promise.all([
      fetch(`/api/lotes?servicioId=${selectedServicio.id}`),
      fetch(`/api/lotes/activity/last?servicioId=${selectedServicio.id}`),
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
  }, [data, selectedServicio]);

  useEffect(() => {
    if (!selectedServicio || selectedLoteIds.length === 0) {
      setChartData([]);
      return;
    }

    const params = new URLSearchParams({ servicioId: selectedServicio.id });
    selectedLoteIds.forEach((id) => params.append("loteId", id));

    setLoadingChart(true);
    setError(null);

    fetch(`/api/stats/distribution?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("No se pudo cargar la distribución");
        }
        return (await res.json()) as DistributionResponse;
      })
      .then((payload) => {
        setChartData(payload.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingChart(false));
  }, [selectedServicio, selectedLoteIds]);

  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter((lote) =>
      lote.nombre.toLowerCase().includes(term)
    );
  }, [lotes, search]);

  const series = useMemo<CaliberSeries[]>(() => {
    return selectedLoteIds.map((id, index) => {
      const lote = lotes.find((item) => item.id === id);
      return {
        key: id,
        label: lote?.nombre ?? `Lote ${id.slice(-4)}`,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      };
    });
  }, [selectedLoteIds, lotes]);

  // Calculate totals for each lote to support percentage view
  const loteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedLoteIds.forEach((id) => {
      totals[id] = 0;
    });

    chartData.forEach((point) => {
      selectedLoteIds.forEach((id) => {
        if (typeof point[id] === "number") {
          totals[id] += point[id];
        }
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
        if (typeof val === "number" && total > 0) {
          // Calculate percentage: (value / total) * 100
          newPoint[id] = (val / total) * 100;
        } else {
          newPoint[id] = 0;
        }
      });
      return newPoint;
    });
  }, [chartData, viewMode, selectedLoteIds, loteTotals]);

  const toggleLote = (loteId: string) => {
    setSelectedLoteIds((prev) =>
      prev.includes(loteId)
        ? prev.filter((id) => id !== loteId)
        : [...prev, loteId]
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">Cargando…</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-red-500">No estás autenticado.</div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Distribución de calibres</h1>
        <p className="text-sm text-muted-foreground">
          Visualiza la distribución de perímetros por lote con precisión de 0.1.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Servicio seleccionado:</span>
            <Badge variant="secondary">
              {selectedServicio?.nombre ?? "Sin servicio"}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar lote..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              onClick={() => setSelectedLoteIds([])}
              disabled={selectedLoteIds.length === 0}
            >
              Limpiar selección
            </Button>
            {activeLote && (
              <Button
                variant="secondary"
                onClick={() => setSelectedLoteIds([activeLote.id])}
              >
                Usar lote activo
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border/50">
            <ScrollArea className="h-60">
              {loadingLotes ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredLotes.map((lote) => (
                    <label
                      key={lote.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 transition hover:border-border/60"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-cyan-500"
                          checked={selectedLoteIds.includes(lote.id)}
                          onChange={() => toggleLote(lote.id)}
                        />
                        <span className="text-sm font-medium">
                          {lote.nombre}
                        </span>
                      </div>
                      {activeLote?.id === lote.id && (
                        <Badge variant="outline">Activo</Badge>
                      )}
                    </label>
                  ))}
                  {filteredLotes.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      No se encontraron lotes.
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedLoteIds.length === 0
              ? "Selecciona al menos un lote para ver la distribución."
              : `Lotes seleccionados: ${selectedLoteIds.length}`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle>Distribución por calibre</CardTitle>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "quantity" | "percentage")}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quantity">Cantidad</TabsTrigger>
              <TabsTrigger value="percentage">%</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-red-500">{error}</div>
          )}
          {loadingChart ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-[360px] w-full" />
            </div>
          ) : selectedLoteIds.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Selecciona uno o más lotes para graficar.
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay datos disponibles para los filtros seleccionados.
            </div>
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
