"use client";

import React, { useContext, useEffect, useState, useMemo } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  X,
  Search,
  Plus,
  Layers,
} from "lucide-react";

import { LoteCombobox } from "./_components/LoteCombobox";
import { LoteContextCard } from "./_components/LoteContextCard";
import { AnaliticaFilters } from "./_components/AnaliticaFilters";
import { EmptyState } from "./_components/EmptyState";
import {
  COLORS,
  displayLoteCode,
  formatNumber,
  formatDateShort,
  normalizeText,
  type AnaliticaFiltersState,
  type ComparacionLote,
  type EvolucionStep,
  type FacetOption,
  type LoteOption,
} from "./_components/types";

interface GlobalLotesResponse {
  data: LoteOption[];
  total: number;
  summary: {
    active: number;
    withData: number;
    totalBulbs: number;
    lastActivity: string | null;
  };
  facets: {
    productos: FacetOption[];
    variedades: (FacetOption & { productoId: string | null })[];
    etapas: FacetOption[];
  };
}

const DEFAULT_FILTERS: AnaliticaFiltersState = {
  search: "",
  productoId: "",
  variedadId: "",
  tipoProcesoId: "",
  hideEmpty: true,
  activity: "todos",
};

export default function AnaliticaPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  const [payload, setPayload] = useState<GlobalLotesResponse | null>(null);
  const [filters, setFilters] = useState<AnaliticaFiltersState>(DEFAULT_FILTERS);

  // Tab 1: Evolucion
  const [selectedLoteEvo, setSelectedLoteEvo] = useState<string>("");
  const [evolucion, setEvolucion] = useState<EvolucionStep[]>([]);
  const [evoLoading, setEvoLoading] = useState(false);

  // Tab 2: Comparacion
  const [selectedLotesComp, setSelectedLotesComp] = useState<string[]>([]);
  const [comparacion, setComparacion] = useState<ComparacionLote[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compMode, setCompMode] = useState<"cantidad" | "porcentaje">("cantidad");

  // ── Fetch lotes (global with facets) ──────────────────────────────────────
  useEffect(() => {
    if (!data?.empresaId) return;
    fetch(`/api/lotes/global?empresaId=${data.empresaId}&all=true`)
      .then((res) => res.json())
      .then((json: GlobalLotesResponse) => setPayload(json))
      .catch(console.error);
  }, [data?.empresaId]);

  // Filter lote options client-side
  const filteredLotes = useMemo(() => {
    if (!payload) return [];
    const term = normalizeText(filters.search);
    const now = Date.now();
    const activityMs =
      filters.activity === "ultimos_7"
        ? 7 * 24 * 60 * 60 * 1000
        : filters.activity === "ultimos_30"
        ? 30 * 24 * 60 * 60 * 1000
        : null;

    return payload.data.filter((l) => {
      if (filters.productoId && l.productoId !== filters.productoId) return false;
      if (filters.variedadId && l.variedadId !== filters.variedadId) return false;
      if (filters.tipoProcesoId && l.etapaActualId !== filters.tipoProcesoId) {
        return false;
      }
      if (filters.hideEmpty && l.totalBulbs === 0 && !l.lastTs) return false;
      if (activityMs !== null) {
        if (!l.lastTs) return false;
        if (now - new Date(l.lastTs).getTime() > activityMs) return false;
      }
      if (term) {
        const hay = normalizeText(
          [
            l.codigoLote,
            l.variedadNombre,
            l.productoNombre,
            l.etapaActual,
            l.servicioActual,
          ].join(" ")
        );
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [payload, filters]);

  // ── Tab 1: Evolucion fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedLoteEvo) {
      setEvolucion([]);
      return;
    }
    setEvoLoading(true);
    fetch(`/api/analitica/lote-evolucion?loteId=${selectedLoteEvo}`)
      .then((r) => r.json())
      .then((d: EvolucionStep[]) => setEvolucion(d))
      .catch(console.error)
      .finally(() => setEvoLoading(false));
  }, [selectedLoteEvo]);

  const evoChartData = useMemo(() => {
    return evolucion.map((step, idx) => ({
      key: `s${idx}`,
      etapaLabel: step.tipoProcesoNombre ?? "Sin etapa",
      servicioLabel: step.servicioNombre,
      fechaLabel: formatDateShort(step.firstTs ?? step.asignadoAt),
      media: step.stats.mean,
      stdDev: step.stats.stdDev,
      total: step.stats.totalCount,
    }));
  }, [evolucion]);

  const evoGlobalMean = useMemo(() => {
    const steps = evolucion.filter((s) => s.stats.totalCount > 0);
    if (steps.length === 0) return null;
    const totalCount = steps.reduce((a, s) => a + s.stats.totalCount, 0);
    const weighted = steps.reduce(
      (a, s) => a + s.stats.mean * s.stats.totalCount,
      0
    );
    return totalCount > 0 ? weighted / totalCount : null;
  }, [evolucion]);

  // ── Tab 2: Comparacion fetch ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedLotesComp.length === 0) {
      setComparacion([]);
      return;
    }
    setCompLoading(true);
    fetch(`/api/analitica/comparacion?loteIds=${selectedLotesComp.join(",")}`)
      .then((r) => r.json())
      .then((json) => setComparacion(json.lotes ?? []))
      .catch(console.error)
      .finally(() => setCompLoading(false));
  }, [selectedLotesComp]);

  const compChartData = useMemo(() => {
    if (comparacion.length === 0) return [];
    const calibreSet = new Set<number>();
    for (const l of comparacion) {
      for (const d of l.distribution) {
        if (d.calibre != null) calibreSet.add(d.calibre);
      }
    }
    const calibres = Array.from(calibreSet).sort((a, b) => a - b);

    return calibres.map((cal) => {
      const point: Record<string, string | number> = { calibre: cal.toFixed(1) };
      comparacion.forEach((l, idx) => {
        const entry = l.distribution.find((d) => d.calibre === cal);
        const count = entry?.count ?? 0;
        point[`l_${idx}`] =
          compMode === "porcentaje"
            ? l.stats.totalCount > 0
              ? parseFloat(((count / l.stats.totalCount) * 100).toFixed(2))
              : 0
            : count;
      });
      return point;
    });
  }, [comparacion, compMode]);

  // Inter-lote diff (visible cuando hay exactamente 2 lotes en comparación)
  const diffData = useMemo(() => {
    if (comparacion.length !== 2) return null;
    const [a, b] = comparacion;
    const calibreSet = new Set<number>();
    for (const d of a.distribution) if (d.calibre != null) calibreSet.add(d.calibre);
    for (const d of b.distribution) if (d.calibre != null) calibreSet.add(d.calibre);
    const calibres = Array.from(calibreSet).sort((x, y) => x - y);
    const chart = calibres.map((cal) => {
      const countA = a.distribution.find((d) => d.calibre === cal)?.count ?? 0;
      const countB = b.distribution.find((d) => d.calibre === cal)?.count ?? 0;
      return { calibre: cal.toFixed(1), delta: countB - countA };
    });
    return { a, b, chart };
  }, [comparacion]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estás autenticado.</div>
      </div>
    );
  }

  const selectedEvoLote = payload?.data.find((l) => l.id === selectedLoteEvo);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-5">
      <Tabs defaultValue="evolucion" className="space-y-4">
        {/* Header con tabs a la derecha */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Analítica
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Evolución de calibre y comparación de lotes
            </p>
          </div>
          <TabsList className="bg-slate-900/60 border border-white/10">
            <TabsTrigger
              value="evolucion"
              className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400 gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Evolución
            </TabsTrigger>
            <TabsTrigger
              value="comparacion"
              className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400 gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Comparación
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filters */}
        {payload && (
          <AnaliticaFilters
            state={filters}
            onChange={setFilters}
            productos={payload.facets.productos}
            variedades={payload.facets.variedades}
            etapas={payload.facets.etapas}
            resultCount={filteredLotes.length}
            totalCount={payload.total}
          />
        )}

        {/* ── Tab Evolución ────────────────────────────────────────────────── */}
        <TabsContent value="evolucion" className="space-y-4">
          <LoteCombobox
            options={filteredLotes}
            value={selectedLoteEvo}
            onChange={setSelectedLoteEvo}
            placeholder="Seleccionar un lote para ver su evolución…"
          />

          {!selectedLoteEvo && (
            <EmptyState
              icon={Search}
              title="Selecciona un lote"
              description="Busca por código, variedad o producto. Verás cómo cambia su distribución de calibre etapa por etapa."
            />
          )}

          {evoLoading && (
            <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
          )}

          {!evoLoading && selectedEvoLote && (
            <>
              <LoteContextCard lote={selectedEvoLote} />

              {evolucion.length > 0 ? (
                <>
                  <Card className="bg-slate-900/40 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white font-semibold tracking-tight">
                        Evolución del calibre medio
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        Cada punto representa una asignación a un servicio
                        {evoGlobalMean != null && (
                          <>
                            {" "}· media global del lote{" "}
                            <span className="font-mono text-cyan-300">
                              {evoGlobalMean.toFixed(2)}
                            </span>
                          </>
                        )}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart
                          data={evoChartData}
                          margin={{ top: 10, right: 20, bottom: 30, left: 10 }}
                        >
                          <defs>
                            <linearGradient id="evoLineGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="key"
                            tick={<EtapaTick data={evoChartData} />}
                            interval={0}
                            height={56}
                            stroke="#334155"
                          />
                          <YAxis
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            content={<EvoTooltip />}
                            cursor={{ stroke: "#334155", strokeWidth: 1 }}
                          />
                          {evoGlobalMean != null && (
                            <ReferenceLine
                              y={evoGlobalMean}
                              stroke="#f59e0b"
                              strokeDasharray="4 4"
                              strokeOpacity={0.6}
                              label={{
                                value: "Media global",
                                position: "insideTopRight",
                                fill: "#f59e0b",
                                fontSize: 10,
                              }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="media"
                            stroke="url(#evoLineGradient)"
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: "#06b6d4", stroke: "#0f172a", strokeWidth: 2 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/40 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white font-semibold">
                        Estadísticas por etapa
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-slate-500">
                              <th className="text-left py-2 pr-4 font-medium">Etapa · Servicio</th>
                              <th className="text-left py-2 pr-4 font-medium">Fecha</th>
                              <th className="text-right py-2 pr-4 font-medium">Total</th>
                              <th className="text-right py-2 pr-4 font-medium">Media</th>
                              <th className="text-right py-2 pr-4 font-medium">σ</th>
                              <th className="text-right py-2 font-medium">Rango</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {evolucion.map((step, idx) => (
                              <tr
                                key={`${step.servicioId}-${idx}`}
                                className="text-white hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-2.5 pr-4">
                                  <div className="text-white text-sm font-medium">
                                    {step.tipoProcesoNombre ?? "Sin etapa"}
                                  </div>
                                  <div className="text-slate-500 text-xs">
                                    {step.servicioNombre}
                                    {step.procesoTemporada && (
                                      <span className="text-slate-600"> · {step.procesoTemporada}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4 text-slate-400 text-xs whitespace-nowrap">
                                  {formatDateShort(step.firstTs ?? step.asignadoAt)}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono">
                                  {formatNumber(step.stats.totalCount)}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono text-cyan-300">
                                  {step.stats.mean.toFixed(2)}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono text-slate-300">
                                  {step.stats.stdDev.toFixed(2)}
                                </td>
                                <td className="py-2.5 text-right font-mono text-slate-400 text-xs">
                                  {step.stats.min.toFixed(1)} – {step.stats.max.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="Este lote aún no tiene mediciones"
                  description="No se registran datos de calibre en ninguna etapa para este lote."
                />
              )}
            </>
          )}
        </TabsContent>

        {/* ── Tab Comparación ──────────────────────────────────────────────── */}
        <TabsContent value="comparacion" className="space-y-4">
          <div className="space-y-3">
            {selectedLotesComp.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLotesComp.map((id, idx) => {
                  const lote = payload?.data.find((l) => l.id === id);
                  if (!lote) return null;
                  return (
                    <Badge
                      key={id}
                      className="bg-slate-900/60 text-white border-white/10 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 cursor-pointer transition-colors gap-1.5"
                      onClick={() =>
                        setSelectedLotesComp((prev) => prev.filter((l) => l !== id))
                      }
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-mono">{displayLoteCode(lote)}</span>
                      {lote.variedadNombre && (
                        <span className="text-slate-400 text-xs">
                          · {lote.variedadNombre}
                        </span>
                      )}
                      <X className="w-3 h-3 ml-0.5" />
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[260px] max-w-md">
                <LoteCombobox
                  options={filteredLotes}
                  value=""
                  onChange={(id) => {
                    if (id && selectedLotesComp.length < 5) {
                      setSelectedLotesComp((prev) => [...prev, id]);
                    }
                  }}
                  placeholder={
                    selectedLotesComp.length >= 5
                      ? "Máximo 5 lotes"
                      : "Agregar lote a comparar…"
                  }
                  excludeIds={selectedLotesComp}
                />
              </div>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                {selectedLotesComp.length}/5 lotes
              </span>
            </div>
          </div>

          {compLoading && (
            <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
          )}

          {!compLoading && selectedLotesComp.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="Compara hasta 5 lotes"
              description="Agrega lotes para comparar sus distribuciones de calibre lado a lado."
            />
          )}

          {!compLoading && comparacion.length > 0 && (
            <>
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base text-white font-semibold tracking-tight">
                        Distribución de calibre
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cantidad de bulbos por calibre, agregada por todas las etapas de cada lote.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {(["cantidad", "porcentaje"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setCompMode(mode)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                            compMode === mode
                              ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40"
                              : "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300"
                          }`}
                        >
                          {mode === "cantidad" ? "Cantidad" : "Porcentaje"}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={compChartData}
                      margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                    >
                      <defs>
                        {comparacion.map((_, idx) => (
                          <linearGradient
                            key={idx}
                            id={`compGrad-${idx}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={COLORS[idx % COLORS.length]}
                              stopOpacity={0.95}
                            />
                            <stop
                              offset="100%"
                              stopColor={COLORS[idx % COLORS.length]}
                              stopOpacity={0.55}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="calibre"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        label={{
                          value: "Calibre",
                          position: "insideBottom",
                          offset: -10,
                          fill: "#475569",
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) =>
                          compMode === "porcentaje" ? `${v}%` : v.toLocaleString("es-CL")
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15,23,42,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        itemStyle={{ color: "#e2e8f0" }}
                        formatter={(value: number, name: string) => [
                          compMode === "porcentaje"
                            ? `${value.toFixed(2)}%`
                            : formatNumber(value),
                          name,
                        ]}
                        labelFormatter={(label) => `Calibre ${label}`}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                        iconType="circle"
                      />
                      {comparacion.map((l, idx) => (
                        <Bar
                          key={l.loteId}
                          dataKey={`l_${idx}`}
                          name={displayLoteCode(l)}
                          fill={`url(#compGrad-${idx})`}
                          radius={[3, 3, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white font-semibold">
                    Métricas estadísticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-slate-500">
                          <th className="text-left py-2 pr-4 font-medium">Lote</th>
                          <th className="text-right py-2 pr-4 font-medium">Total</th>
                          <th className="text-right py-2 pr-4 font-medium">Media</th>
                          <th className="text-right py-2 pr-4 font-medium">σ</th>
                          <th className="text-right py-2 pr-4 font-medium">Varianza</th>
                          <th className="text-right py-2 font-medium">Rango</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {comparacion.map((l, idx) => {
                          const fullLote = payload?.data.find((x) => x.id === l.loteId);
                          return (
                            <tr
                              key={l.loteId}
                              className="text-white hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: COLORS[idx % COLORS.length],
                                    }}
                                  />
                                  <span className="font-mono text-sm">
                                    {displayLoteCode(l)}
                                  </span>
                                  {fullLote?.variedadNombre && (
                                    <span className="text-slate-500 text-xs">
                                      · {fullLote.variedadNombre}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono">
                                {formatNumber(l.stats.totalCount)}
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono text-cyan-300">
                                {l.stats.mean.toFixed(2)}
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono text-slate-300">
                                {l.stats.stdDev.toFixed(2)}
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono text-slate-400">
                                {l.stats.variance.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-400 text-xs">
                                {l.stats.min.toFixed(1)} – {l.stats.max.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Inter-lote diff cuando hay exactamente 2 lotes */}
              {diffData && (
                <Card className="bg-slate-900/40 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white font-semibold tracking-tight">
                      Diferencia por calibre
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-300">{displayLoteCode(diffData.b)}</span>
                      {" − "}
                      <span className="font-mono text-slate-300">{displayLoteCode(diffData.a)}</span>
                      {" · Verde = el segundo lote tiene más bulbos en ese calibre."}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={diffData.chart}
                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="calibre" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          tickFormatter={(v) => v.toLocaleString("es-CL")}
                        />
                        <ReferenceLine y={0} stroke="#475569" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15,23,42,0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                          itemStyle={{ color: "#e2e8f0" }}
                          formatter={(value: number) => [formatNumber(value), "Δ bulbos"]}
                          labelFormatter={(label) => `Calibre ${label}`}
                        />
                        <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
                          {diffData.chart.map((entry) => (
                            <Cell
                              key={entry.calibre}
                              fill={entry.delta >= 0 ? "#10b981" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

interface EtapaChartPoint {
  key: string;
  etapaLabel: string;
  servicioLabel: string;
  fechaLabel: string;
  media: number;
  stdDev: number;
  total: number;
}

function EtapaTick({
  data,
  x,
  y,
  payload,
}: {
  data: EtapaChartPoint[];
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const point = data.find((d) => d.key === payload?.value);
  if (!point || x == null || y == null) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="#cbd5e1"
        fontSize={11}
        fontWeight={500}
      >
        {point.etapaLabel}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="#64748b" fontSize={9}>
        {point.servicioLabel}
      </text>
      <text x={0} y={0} dy={42} textAnchor="middle" fill="#475569" fontSize={9}>
        {point.fechaLabel}
      </text>
    </g>
  );
}

function EvoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: EtapaChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg bg-slate-950/95 border border-white/10 shadow-xl px-3 py-2 text-xs">
      <div className="font-semibold text-white">{p.etapaLabel}</div>
      <div className="text-slate-400">{p.servicioLabel}</div>
      <div className="text-slate-500 text-[10px] mb-1.5">{p.fechaLabel}</div>
      <div className="flex justify-between gap-4 text-slate-300">
        <span>Media</span>
        <span className="font-mono text-cyan-300">{p.media.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-300">
        <span>σ</span>
        <span className="font-mono">{p.stdDev.toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-300">
        <span>Total</span>
        <span className="font-mono">{formatNumber(p.total)}</span>
      </div>
    </div>
  );
}
