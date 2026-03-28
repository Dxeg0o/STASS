"use client";

import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import {
  Gauge,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";

// ---------- Types ----------

interface HourlyData {
  date: string;
  hour: number;
  count: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface ProduccionResponse {
  hourly: HourlyData[];
  daily: DailyData[];
  total: number;
  avgPerHour: number;
  avgStartTime: string | null;
  avgEndTime: string | null;
}

interface Proceso {
  id: string;
  tipoProceso: { nombre: string };
  temporada: string | null;
}

// ---------- Helpers ----------

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

const RANGE_OPTIONS = [
  { label: "Ultima hora", value: "1h" },
  { label: "Hoy", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
];

function getDateRange(range: string): { desde: Date; hasta: Date } {
  const now = new Date();
  const hasta = now;
  let desde: Date;

  switch (range) {
    case "1h":
      desde = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "today":
      desde = new Date(now);
      desde.setHours(0, 0, 0, 0);
      break;
    case "week":
      desde = new Date(now);
      desde.setDate(desde.getDate() - 7);
      desde.setHours(0, 0, 0, 0);
      break;
    case "month":
      desde = new Date(now);
      desde.setMonth(desde.getMonth() - 1);
      desde.setHours(0, 0, 0, 0);
      break;
    default:
      desde = new Date(now);
      desde.setHours(0, 0, 0, 0);
  }

  return { desde, hasta };
}

// ---------- Main Page ----------

export default function ControlOperacionalPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  const [range, setRange] = useState("today");
  const [produccion, setProduccion] = useState<ProduccionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [selectedProceso, setSelectedProceso] = useState<string>("");

  // Fetch procesos for filter
  useEffect(() => {
    if (!data?.empresaId) return;
    fetch(`/api/procesos?empresaId=${data.empresaId}&estado=en_curso`)
      .then((res) => res.json())
      .then((arr: Proceso[]) => setProcesos(arr))
      .catch(console.error);
  }, [data?.empresaId]);

  // Fetch production data
  const fetchProduccion = useCallback(async () => {
    if (!data?.empresaId) return;
    setLoading(true);
    setError(null);

    const { desde, hasta } = getDateRange(range);
    const params = new URLSearchParams({
      empresaId: data.empresaId,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
    });
    if (selectedProceso) params.set("procesoId", selectedProceso);

    try {
      const res = await fetch(`/api/control/produccion?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar datos de produccion");
      const json: ProduccionResponse = await res.json();
      setProduccion(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [data?.empresaId, range, selectedProceso]);

  useEffect(() => {
    fetchProduccion();
  }, [fetchProduccion]);

  // Scatter chart data: aggregate by hour of day
  const scatterData = useMemo(() => {
    if (!produccion) return [];
    return produccion.hourly.map((h) => ({
      hour: h.hour,
      count: h.count,
      date: h.date,
    }));
  }, [produccion]);

  // Heatmap data: hour x day-of-week
  const heatmapData = useMemo(() => {
    if (!produccion) return [];
    const map = new Map<string, number>();
    for (const h of produccion.hourly) {
      const dayOfWeek = new Date(h.date).getDay();
      const key = `${dayOfWeek}-${h.hour}`;
      map.set(key, (map.get(key) ?? 0) + h.count);
    }
    return Array.from(map.entries()).map(([key, count]) => {
      const [day, hour] = key.split("-").map(Number);
      return { day, hour, count };
    });
  }, [produccion]);

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

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Control Operacional
        </h1>
        <p className="text-slate-400 mt-1">{data.empresaNombre ?? ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time range */}
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                range === opt.value
                  ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Proceso filter */}
        {procesos.length > 0 && (
          <select
            value={selectedProceso}
            onChange={(e) => setSelectedProceso(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-slate-900/40 text-slate-400 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="">Todos los procesos</option>
            {procesos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tipoProceso.nombre}
                {p.temporada ? ` · ${p.temporada}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"
              />
            ))}
          </div>
          <div className="h-80 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />
        </div>
      )}

      {produccion && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-slate-500">Total bulbos</p>
                </div>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  {formatNumber(produccion.total)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-slate-500">Promedio/hora</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatNumber(produccion.avgPerHour)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-slate-500">Inicio promedio</p>
                </div>
                <p className="text-2xl font-bold text-cyan-400 font-mono">
                  {produccion.avgStartTime ?? "\u2014"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <p className="text-xs text-slate-500">Termino promedio</p>
                </div>
                <p className="text-2xl font-bold text-orange-400 font-mono">
                  {produccion.avgEndTime ?? "\u2014"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scatter plot: production per hour */}
          <Card className="bg-slate-900/40 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">
                Produccion por hora del dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scatterData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                  Sin datos en este periodo
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number"
                      dataKey="hour"
                      domain={[0, 23]}
                      ticks={Array.from({ length: 24 }, (_, i) => i)}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(v) => `${v}:00`}
                      label={{
                        value: "Hora",
                        position: "insideBottomRight",
                        offset: -5,
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="count"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(v) => v.toLocaleString("es-CL")}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [
                        formatNumber(value),
                        "Bulbos",
                      ]}
                      labelFormatter={(label) => `${label}:00`}
                    />
                    <Scatter
                      data={scatterData}
                      fill="#06b6d4"
                      fillOpacity={0.7}
                      r={5}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Secondary charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily production line chart */}
            <Card className="bg-slate-900/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">
                  Produccion diaria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {produccion.daily.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                    Sin datos
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={produccion.daily}
                      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
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
                        formatter={(value: number) => [
                          formatNumber(value),
                          "Bulbos",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#06b6d4" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Heatmap approximation: bar chart grouped by hour */}
            <Card className="bg-slate-900/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">
                  Produccion acumulada por hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                {produccion.hourly.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                    Sin datos
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={(() => {
                        // Aggregate by hour across all days
                        const hourMap = new Map<number, number>();
                        for (const h of produccion.hourly) {
                          hourMap.set(
                            h.hour,
                            (hourMap.get(h.hour) ?? 0) + h.count
                          );
                        }
                        return Array.from(hourMap.entries())
                          .sort((a, b) => a[0] - b[0])
                          .map(([hour, count]) => ({ hour, count }));
                      })()}
                      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => `${v}h`}
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
                        formatter={(value: number) => [
                          formatNumber(value),
                          "Bulbos",
                        ]}
                        labelFormatter={(v) => `${v}:00`}
                      />
                      <Bar
                        dataKey="count"
                        fill="#10b981"
                        fillOpacity={0.7}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !produccion && !error && (
        <div className="text-center py-20 text-slate-500">
          <Gauge className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">Sin datos de produccion</p>
        </div>
      )}
    </div>
  );
}
