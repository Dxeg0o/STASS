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
  BarChart,
  Bar,
  Legend,
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

interface HourlyDispositivoData {
  date: string;
  hour: number;
  dispositivoId: string;
  dispositivoNombre: string;
  count: number;
}

interface DispositivoResumen {
  id: string;
  nombre: string;
  total: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface ProduccionResponse {
  hourly: HourlyData[];
  hourlyPorDispositivo: HourlyDispositivoData[];
  dispositivos: DispositivoResumen[];
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

interface Servicio {
  id: string;
  nombre: string;
  tipo: string;
  tipoProcesoNombre: string | null;
  procesoTemporada: string | null;
}

// ---------- Helpers ----------

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

// Paleta para las series por dispositivo. El primer color coincide con el cian
// del gráfico general para que el cambio de vista no se sienta como otro
// gráfico cuando hay un solo equipo.
const DISPOSITIVO_COLORS = [
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#84cc16",
];

function colorForIndex(i: number): string {
  return DISPOSITIVO_COLORS[i % DISPOSITIVO_COLORS.length];
}

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Parse "YYYY-MM-DD" como fecha local para evitar corrimiento por zona horaria.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(iso);
}

function fechaConDia(iso: string): string {
  const d = parseLocalDate(iso);
  return `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function fechaDM(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fechaLarga(iso: string): string {
  const d = parseLocalDate(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()].toLowerCase()}`;
}

const MENSAJES_CARGA = [
  "Contando bulbo por bulbo…",
  "Ordenando los números, aguanta un toque…",
  "Juntando la producción, ya casi…",
  "Buscando los datos donde los dejamos…",
  "Sacando cuentas, no paniquees…",
];

function CargandoProduccion({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-1.5 w-56 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 animate-barra" />
      </div>
      <p className="text-sm text-slate-400">{mensaje}</p>
    </div>
  );
}

const RANGE_OPTIONS = [
  { label: "Ultima hora", value: "1h" },
  { label: "Hoy", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
  { label: "Este año", value: "year" },
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
    case "year":
      desde = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
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
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<string>("");
  const [vistaHora, setVistaHora] = useState<"general" | "dispositivo">(
    "general"
  );

  // Fetch procesos for filter
  useEffect(() => {
    if (!data?.empresaId) return;
    fetch(`/api/procesos?empresaId=${data.empresaId}&estado=en_curso`)
      .then((res) => res.json())
      .then((arr: Proceso[]) => setProcesos(arr))
      .catch(console.error);
  }, [data?.empresaId]);

  // Fetch servicios filtered by proceso
  useEffect(() => {
    if (!data?.empresaId) return;
    setSelectedServicio("");
    const params = new URLSearchParams({ empresaId: data.empresaId });
    if (selectedProceso) params.set("procesoId", selectedProceso);
    fetch(`/api/servicios?${params.toString()}`)
      .then((res) => res.json())
      .then((arr: Servicio[]) => setServicios(arr))
      .catch(console.error);
  }, [data?.empresaId, selectedProceso]);

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
    if (selectedServicio) {
      params.set("servicioId", selectedServicio);
    } else if (selectedProceso) {
      params.set("procesoId", selectedProceso);
    }

    try {
      const res = await fetch(`/api/control/produccion?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar datos de produccion");
      const json: ProduccionResponse = await res.json();
      setProduccion(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [data?.empresaId, range, selectedProceso, selectedServicio]);

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

  // Una serie por dispositivo, cada una con sus puntos (hora, conteo). Recharts
  // pinta un <Scatter> por serie, así que el agrupado se hace acá.
  const seriesPorDispositivo = useMemo(() => {
    if (!produccion) return [];
    const porId = new Map<
      string,
      { hour: number; count: number; date: string; nombre: string }[]
    >();
    for (const row of produccion.hourlyPorDispositivo) {
      const punto = {
        hour: row.hour,
        count: row.count,
        date: row.date,
        nombre: row.dispositivoNombre,
      };
      const puntos = porId.get(row.dispositivoId);
      if (puntos) puntos.push(punto);
      else porId.set(row.dispositivoId, [punto]);
    }
    return produccion.dispositivos.map((d, i) => ({
      id: d.id,
      nombre: d.nombre,
      total: d.total,
      color: colorForIndex(i),
      puntos: porId.get(d.id) ?? [],
    }));
  }, [produccion]);

  // Mensaje de carga fijo por sesión (sin parpadeo entre refetches)
  const [mensajeCarga] = useState(
    () => MENSAJES_CARGA[Math.floor(Math.random() * MENSAJES_CARGA.length)]
  );

  const isHorario = range === "1h" || range === "today";
  const isAnual = range === "year";
  const porDispositivo = isHorario && vistaHora === "dispositivo";

  // Agregación mensual para el rango "año" (evita 365 puntos)
  const monthlyData = useMemo(() => {
    if (!produccion) return [];
    const m = new Map<number, number>();
    for (const d of produccion.daily) {
      const month = parseLocalDate(d.date).getMonth();
      m.set(month, (m.get(month) ?? 0) + d.count);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, count]) => ({ month, count }));
  }, [produccion]);

  // Datos acumulados por hora (patrón de jornada), reutilizado en ambos modos
  const hourlyAggData = useMemo(() => {
    if (!produccion) return [];
    const hourMap = new Map<number, number>();
    for (const h of produccion.hourly) {
      hourMap.set(h.hour, (hourMap.get(h.hour) ?? 0) + h.count);
    }
    return Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ hour, count }));
  }, [produccion]);

  const dailyChartData = isAnual ? monthlyData : produccion?.daily ?? [];

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

        {/* Servicio filter */}
        {servicios.length > 0 && (
          <select
            value={selectedServicio}
            onChange={(e) => setSelectedServicio(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-slate-900/40 text-slate-400 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
          >
            <option value="">Todos los servicios</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
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

      {/* Primera carga: aún no hay datos previos */}
      {loading && !produccion && (
        <div className="min-h-[60vh] flex items-center justify-center">
          <CargandoProduccion mensaje={mensajeCarga} />
        </div>
      )}

      {produccion && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <CargandoProduccion mensaje={mensajeCarga} />
            </div>
          )}
          <div
            className={`space-y-6 transition-opacity duration-200 ${
              loading ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}
          >
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
                  {produccion.avgStartTime ?? "—"}
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
                  {produccion.avgEndTime ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico principal: detalle por hora (Hoy) o tendencia por día/mes */}
          <Card className="bg-slate-900/40 border-white/10">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base text-white">
                  {isHorario
                    ? "Producción por hora del día"
                    : isAnual
                    ? "Producción por mes"
                    : "Producción por día"}
                </CardTitle>

                {/* Cambio de vista: total de la empresa vs desglose por equipo.
                    Solo en los rangos horarios — en día/mes el gráfico es de
                    barras agregadas y el desglose no aplica. */}
                {isHorario && (
                  <div className="flex rounded-full border border-white/10 bg-slate-950/40 p-0.5">
                    {(
                      [
                        { value: "general", label: "General" },
                        { value: "dispositivo", label: "Por dispositivo" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVistaHora(opt.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                          vistaHora === opt.value
                            ? "bg-cyan-950/70 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isHorario ? (
                porDispositivo ? (
                  seriesPorDispositivo.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                      Sin datos por dispositivo en este periodo
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
                          cursor={{ strokeDasharray: "3 3" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0].payload as {
                              hour: number;
                              count: number;
                              date: string;
                              nombre: string;
                            };
                            return (
                              <div className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-xs">
                                <div className="text-slate-300">{p.nombre}</div>
                                <div className="text-slate-400">
                                  {fechaLarga(p.date)} · {p.hour}:00
                                </div>
                                <div className="text-slate-200">
                                  {formatNumber(p.count)} bulbos
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          iconType="circle"
                        />
                        {seriesPorDispositivo.map((s) => (
                          <Scatter
                            key={s.id}
                            name={s.nombre}
                            data={s.puntos}
                            fill={s.color}
                            fillOpacity={0.7}
                            r={5}
                          />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  )
                ) : scatterData.length === 0 ? (
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
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as {
                            hour: number;
                            count: number;
                            date: string;
                          };
                          return (
                            <div className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-xs">
                              <div className="text-slate-400">
                                {fechaLarga(p.date)} · {p.hour}:00
                              </div>
                              <div className="text-slate-200">
                                {formatNumber(p.count)} bulbos
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={scatterData}
                        fill="#06b6d4"
                        fillOpacity={0.7}
                        r={5}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )
              ) : dailyChartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                  Sin datos en este periodo
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={isAnual ? "month" : "date"}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      interval={range === "month" ? 4 : 0}
                      tickFormatter={(v) =>
                        isAnual
                          ? MESES_CORTOS[v as number]
                          : range === "week"
                          ? fechaConDia(String(v))
                          : fechaDM(String(v))
                      }
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(v) => v.toLocaleString("es-CL")}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                      itemStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number) => [formatNumber(value), "Bulbos"]}
                      labelFormatter={(label) =>
                        isAnual
                          ? MESES_LARGOS[label as number]
                          : fechaLarga(String(label))
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="#06b6d4"
                      fillOpacity={0.8}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Resumen por dispositivo, visible solo en la vista desglosada */}
          {porDispositivo && seriesPorDispositivo.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {seriesPorDispositivo.map((s) => (
                <Card key={s.id} className="bg-slate-900/40 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <p
                        className="text-xs text-slate-400 truncate"
                        title={s.nombre}
                      >
                        {s.nombre}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {formatNumber(s.total)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatNumber(Math.round(s.total / (s.puntos.length || 1)))}{" "}
                      /hora
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Secundario: producción acumulada por hora (patrón de jornada) */}
          <Card className="bg-slate-900/40 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">
                Producción acumulada por hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hourlyAggData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                  Sin datos
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={hourlyAggData}
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
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                      itemStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number) => [formatNumber(value), "Bulbos"]}
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
        </div>
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
