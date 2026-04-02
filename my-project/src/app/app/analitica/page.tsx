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
} from "recharts";
import { Search, X } from "lucide-react";

// ---------- Types ----------

interface EvolucionStep {
  servicioId: string;
  servicioNombre: string;
  tipoProcesoNombre: string | null;
  asignadoAt: string;
  distribution: { calibre: number; count: number }[];
  stats: {
    totalCount: number;
    mean: number;
    stdDev: number;
    variance: number;
  };
}

interface ComparacionLote {
  loteId: string;
  distribution: { calibre: number; count: number }[];
  stats: {
    totalCount: number;
    mean: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
  };
}

interface LoteOption {
  id: string;
  variedadNombre: string | null;
  productoNombre: string | null;
}

// ---------- Helpers ----------

const COLORS = ["#06b6d4", "#6366f1", "#f97316", "#10b981", "#ec4899", "#eab308"];

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

// ---------- Main Page ----------

export default function AnaliticaPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  // Shared state: lote options
  const [loteOptions, setLoteOptions] = useState<LoteOption[]>([]);

  // Tab 1: Evolucion
  const [selectedLoteEvo, setSelectedLoteEvo] = useState<string>("");
  const [evolucion, setEvolucion] = useState<EvolucionStep[]>([]);
  const [evoLoading, setEvoLoading] = useState(false);

  // Tab 2: Comparacion
  const [selectedLotesComp, setSelectedLotesComp] = useState<string[]>([]);
  const [comparacion, setComparacion] = useState<ComparacionLote[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compMode, setCompMode] = useState<"cantidad" | "porcentaje">("cantidad");

  // Tab 3: Diferencias
  const [selectedLoteDiff, setSelectedLoteDiff] = useState<string>("");
  const [diffEvolucion, setDiffEvolucion] = useState<EvolucionStep[]>([]);
  const [diffStep1, setDiffStep1] = useState(0);
  const [diffStep2, setDiffStep2] = useState(1);
  const [diffLoading, setDiffLoading] = useState(false);

  // Fetch lote options for search
  useEffect(() => {
    if (!data?.empresaId) return;
    fetch(`/api/lotes/global?empresaId=${data.empresaId}&limit=100`)
      .then((res) => res.json())
      .then((json) => {
        setLoteOptions(
          json.data?.map((l: LoteOption) => ({
            id: l.id,
            variedadNombre: l.variedadNombre,
            productoNombre: l.productoNombre,
          })) ?? []
        );
      })
      .catch(console.error);
  }, [data?.empresaId]);

  // ── Tab 1: Fetch evolucion ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedLoteEvo) {
      setEvolucion([]);
      return;
    }
    setEvoLoading(true);
    fetch(`/api/analitica/lote-evolucion?loteId=${selectedLoteEvo}`)
      .then((res) => res.json())
      .then((data: EvolucionStep[]) => setEvolucion(data))
      .catch(console.error)
      .finally(() => setEvoLoading(false));
  }, [selectedLoteEvo]);

  // Evolucion chart data: mean calibre at each step
  const evoChartData = useMemo(() => {
    return evolucion.map((step) => ({
      name: step.tipoProcesoNombre ?? step.servicioNombre,
      media: step.stats.mean,
      stdDev: step.stats.stdDev,
      total: step.stats.totalCount,
    }));
  }, [evolucion]);

  // ── Tab 2: Fetch comparacion ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedLotesComp.length === 0) {
      setComparacion([]);
      return;
    }
    setCompLoading(true);
    fetch(
      `/api/analitica/comparacion?loteIds=${selectedLotesComp.join(",")}`
    )
      .then((res) => res.json())
      .then((json) => setComparacion(json.lotes ?? []))
      .catch(console.error)
      .finally(() => setCompLoading(false));
  }, [selectedLotesComp]);

  // Build comparison chart: overlay distributions
  const compChartData = useMemo(() => {
    if (comparacion.length === 0) return [];
    const calibreSet = new Set<number>();
    for (const l of comparacion) {
      for (const d of l.distribution) calibreSet.add(d.calibre);
    }
    const calibres = Array.from(calibreSet).sort((a, b) => a - b);

    return calibres.map((cal) => {
      const point: Record<string, string | number> = { calibre: cal.toFixed(1) };
      for (const l of comparacion) {
        const entry = l.distribution.find((d) => d.calibre === cal);
        const count = entry?.count ?? 0;
        if (compMode === "porcentaje") {
          point[l.loteId.slice(-8)] =
            l.stats.totalCount > 0
              ? parseFloat(((count / l.stats.totalCount) * 100).toFixed(2))
              : 0;
        } else {
          point[l.loteId.slice(-8)] = count;
        }
      }
      return point;
    });
  }, [comparacion, compMode]);

  // ── Tab 3: Fetch diff ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedLoteDiff) {
      setDiffEvolucion([]);
      return;
    }
    setDiffLoading(true);
    fetch(`/api/analitica/lote-evolucion?loteId=${selectedLoteDiff}`)
      .then((res) => res.json())
      .then((data: EvolucionStep[]) => {
        setDiffEvolucion(data);
        if (data.length >= 2) {
          setDiffStep1(0);
          setDiffStep2(data.length - 1);
        }
      })
      .catch(console.error)
      .finally(() => setDiffLoading(false));
  }, [selectedLoteDiff]);

  // Build delta chart
  const deltaChartData = useMemo(() => {
    if (
      diffEvolucion.length < 2 ||
      diffStep1 >= diffEvolucion.length ||
      diffStep2 >= diffEvolucion.length
    )
      return [];

    const step1 = diffEvolucion[diffStep1];
    const step2 = diffEvolucion[diffStep2];

    const calibreSet = new Set<number>();
    for (const d of step1.distribution) calibreSet.add(d.calibre);
    for (const d of step2.distribution) calibreSet.add(d.calibre);

    const calibres = Array.from(calibreSet).sort((a, b) => a - b);

    return calibres.map((cal) => {
      const count1 =
        step1.distribution.find((d) => d.calibre === cal)?.count ?? 0;
      const count2 =
        step2.distribution.find((d) => d.calibre === cal)?.count ?? 0;
      const delta = count2 - count1;
      return {
        calibre: cal.toFixed(1),
        delta,
        etapa1: count1,
        etapa2: count2,
      };
    });
  }, [diffEvolucion, diffStep1, diffStep2]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estas autenticado.</div>
      </div>
    );
  }

  // ── Lote selector component ───────────────────────────────────────────────
  const LoteSelector = ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
  }) => (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 cursor-pointer"
      >
        <option value="">{placeholder ?? "Seleccionar lote..."}</option>
        {loteOptions.map((l) => (
          <option key={l.id} value={l.id}>
            {l.id.slice(-8)}
            {l.variedadNombre ? ` - ${l.variedadNombre}` : ""}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Analitica
        </h1>
        <p className="text-slate-400 mt-1">
          Evolucion de calibre, comparacion de lotes y metricas estadisticas
        </p>
      </div>

      <Tabs defaultValue="evolucion" className="space-y-4">
        <TabsList className="bg-slate-800/60 border border-white/10">
          <TabsTrigger
            value="evolucion"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Evolucion
          </TabsTrigger>
          <TabsTrigger
            value="comparacion"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Comparacion
          </TabsTrigger>
          <TabsTrigger
            value="diferencias"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Diferencias
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Evolucion ───────────────────────────────────────────────── */}
        <TabsContent value="evolucion" className="space-y-4">
          <LoteSelector
            value={selectedLoteEvo}
            onChange={setSelectedLoteEvo}
            placeholder="Seleccionar lote para ver evolucion..."
          />

          {evoLoading && (
            <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
          )}

          {!evoLoading && evolucion.length > 0 && (
            <>
              {/* Mean calibre evolution line chart */}
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">
                    Evolucion del calibre medio por etapa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={evoChartData}
                      margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="media"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ r: 5, fill: "#06b6d4" }}
                        name="Media calibre"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stats table */}
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">
                    Estadisticas por etapa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="text-left py-2 pr-4 font-medium">
                            Etapa
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Total
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Media
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Desv. Est.
                          </th>
                          <th className="text-right py-2 font-medium">
                            Varianza
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {evolucion.map((step) => (
                          <tr key={step.servicioId} className="text-white">
                            <td className="py-2.5 pr-4">
                              <span className="text-cyan-400 text-xs">
                                {step.tipoProcesoNombre ?? ""}
                              </span>
                              <br />
                              <span className="text-slate-400 text-xs">
                                {step.servicioNombre}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              {formatNumber(step.stats.totalCount)}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-cyan-300">
                              {step.stats.mean.toFixed(2)}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-slate-300">
                              {step.stats.stdDev.toFixed(2)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-400">
                              {step.stats.variance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!evoLoading && selectedLoteEvo && evolucion.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No hay datos de evolucion para este lote.
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Comparacion ─────────────────────────────────────────────── */}
        <TabsContent value="comparacion" className="space-y-4">
          {/* Multi-select lotes */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {selectedLotesComp.map((id) => (
                <Badge
                  key={id}
                  className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors"
                  onClick={() =>
                    setSelectedLotesComp((prev) =>
                      prev.filter((l) => l !== id)
                    )
                  }
                >
                  {id.slice(-8)} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="max-w-sm">
              <select
                value=""
                onChange={(e) => {
                  if (
                    e.target.value &&
                    !selectedLotesComp.includes(e.target.value) &&
                    selectedLotesComp.length < 5
                  ) {
                    setSelectedLotesComp((prev) => [...prev, e.target.value]);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 cursor-pointer"
              >
                <option value="">Agregar lote para comparar...</option>
                {loteOptions
                  .filter((l) => !selectedLotesComp.includes(l.id))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id.slice(-8)}
                      {l.variedadNombre ? ` - ${l.variedadNombre}` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {compLoading && (
            <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
          )}

          {!compLoading && comparacion.length > 0 && (
            <>
              {/* Overlay distribution chart */}
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white">
                      Distribucion de calibre
                    </CardTitle>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="calibre"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) =>
                          compMode === "porcentaje"
                            ? `${v}%`
                            : v.toLocaleString("es-CL")
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [
                          compMode === "porcentaje"
                            ? `${value.toFixed(2)}%`
                            : formatNumber(value),
                          name,
                        ]}
                      />
                      <Legend />
                      {comparacion.map((l, idx) => (
                        <Bar
                          key={l.loteId}
                          dataKey={l.loteId.slice(-8)}
                          fill={COLORS[idx % COLORS.length]}
                          fillOpacity={0.7}
                          radius={[2, 2, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stats comparison table */}
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">
                    Metricas estadisticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="text-left py-2 pr-4 font-medium">
                            Lote
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Total
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Media
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Desv. Est.
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Varianza
                          </th>
                          <th className="text-right py-2 pr-4 font-medium">
                            Min
                          </th>
                          <th className="text-right py-2 font-medium">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {comparacion.map((l, idx) => (
                          <tr key={l.loteId} className="text-white">
                            <td className="py-2.5 pr-4 font-mono text-xs">
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-2"
                                style={{
                                  backgroundColor:
                                    COLORS[idx % COLORS.length],
                                }}
                              />
                              {l.loteId.slice(-8)}
                            </td>
                            <td className="py-2.5 pr-4 text-right">
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
                            <td className="py-2.5 pr-4 text-right font-mono text-slate-400">
                              {l.stats.min.toFixed(1)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-400">
                              {l.stats.max.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Tab: Diferencias ─────────────────────────────────────────────── */}
        <TabsContent value="diferencias" className="space-y-4">
          <LoteSelector
            value={selectedLoteDiff}
            onChange={setSelectedLoteDiff}
            placeholder="Seleccionar lote para ver diferencias..."
          />

          {diffLoading && (
            <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
          )}

          {!diffLoading && diffEvolucion.length >= 2 && (
            <>
              {/* Step selectors */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Etapa A
                  </label>
                  <select
                    value={diffStep1}
                    onChange={(e) => setDiffStep1(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 cursor-pointer"
                  >
                    {diffEvolucion.map((step, idx) => (
                      <option key={idx} value={idx}>
                        {step.tipoProcesoNombre ?? step.servicioNombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1 text-slate-500">vs</div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Etapa B
                  </label>
                  <select
                    value={diffStep2}
                    onChange={(e) => setDiffStep2(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 cursor-pointer"
                  >
                    {diffEvolucion.map((step, idx) => (
                      <option key={idx} value={idx}>
                        {step.tipoProcesoNombre ?? step.servicioNombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delta chart */}
              <Card className="bg-slate-900/40 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">
                    Diferencia por calibre
                    <span className="text-sm font-normal text-slate-400 ml-2">
                      (
                      {diffEvolucion[diffStep2]?.tipoProcesoNombre ??
                        diffEvolucion[diffStep2]?.servicioNombre}{" "}
                      vs{" "}
                      {diffEvolucion[diffStep1]?.tipoProcesoNombre ??
                        diffEvolucion[diffStep1]?.servicioNombre}
                      )
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deltaChartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                      Sin datos para comparar
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={deltaChartData}
                        margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#1e293b"
                        />
                        <XAxis
                          dataKey="calibre"
                          tick={{ fill: "#64748b", fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          tickFormatter={(v) => v.toLocaleString("es-CL")}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => [
                            formatNumber(value),
                            name === "delta" ? "Diferencia" : name,
                          ]}
                        />
                        <Bar
                          dataKey="delta"
                          fill="#06b6d4"
                          radius={[4, 4, 0, 0]}
                        >
                          {deltaChartData.map((entry, idx) => (
                            <rect
                              key={idx}
                              fill={entry.delta >= 0 ? "#10b981" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Summary stats comparison */}
              {diffEvolucion[diffStep1] && diffEvolucion[diffStep2] && (
                <Card className="bg-slate-900/40 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">
                      Comparacion de estadisticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400">
                            <th className="text-left py-2 pr-4 font-medium">
                              Metrica
                            </th>
                            <th className="text-right py-2 pr-4 font-medium">
                              {diffEvolucion[diffStep1].tipoProcesoNombre ??
                                "Etapa A"}
                            </th>
                            <th className="text-right py-2 pr-4 font-medium">
                              {diffEvolucion[diffStep2].tipoProcesoNombre ??
                                "Etapa B"}
                            </th>
                            <th className="text-right py-2 font-medium">
                              Delta
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            {
                              label: "Total bulbos",
                              a: diffEvolucion[diffStep1].stats.totalCount,
                              b: diffEvolucion[diffStep2].stats.totalCount,
                              format: formatNumber,
                            },
                            {
                              label: "Media calibre",
                              a: diffEvolucion[diffStep1].stats.mean,
                              b: diffEvolucion[diffStep2].stats.mean,
                              format: (v: number) => v.toFixed(2),
                            },
                            {
                              label: "Desv. estandar",
                              a: diffEvolucion[diffStep1].stats.stdDev,
                              b: diffEvolucion[diffStep2].stats.stdDev,
                              format: (v: number) => v.toFixed(2),
                            },
                          ].map((row) => {
                            const delta = row.b - row.a;
                            const pct =
                              row.a !== 0
                                ? ((delta / row.a) * 100).toFixed(1)
                                : "\u2014";
                            return (
                              <tr key={row.label} className="text-white">
                                <td className="py-2.5 pr-4 text-slate-400">
                                  {row.label}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono">
                                  {row.format(row.a)}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono">
                                  {row.format(row.b)}
                                </td>
                                <td
                                  className={`py-2.5 text-right font-mono ${
                                    delta > 0
                                      ? "text-emerald-400"
                                      : delta < 0
                                      ? "text-red-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {delta > 0 ? "+" : ""}
                                  {row.format(delta)} ({pct}%)
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
            </>
          )}

          {!diffLoading &&
            selectedLoteDiff &&
            diffEvolucion.length < 2 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                Este lote necesita al menos 2 etapas para comparar diferencias.
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
