"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  CaliberChart,
  CaliberDataPoint,
  CaliberSeries,
} from "@/components/CaliberChart";
import {
  LoteLifecycleTimeline,
  LifecycleStep,
} from "@/components/app/LoteLifecycleTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: string;
  dispositivoNombre: string;
  startTime: string;
}

interface DeviceStats {
  dispositivoNombre: string;
  totalIn: number;
  totalOut: number;
  lastTs: string | null;
}

interface LoteDetail {
  id: string;
  codigoLote: string | null;
  createdAt: string;
  variedadNombre: string | null;
  variedadTipo: string | null;
  productoNombre: string | null;
  lifecycle: LifecycleStep[];
  activeSessions: ActiveSession[];
  totalStats: {
    totalIn: number;
    totalOut: number;
  };
  devices: DeviceStats[];
  hasCajas: boolean;
}

interface Conteo {
  id: string;
  hora: string;
  direction: string;
  dispositivo: string;
  perimetro: number | null;
  perimeter?: number | null;
}

interface DistributionResponse {
  data: CaliberDataPoint[];
  series: { loteId: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERIES_COLORS = ["#06b6d4", "#6366f1", "#f97316", "#10b981", "#ec4899"];
const CONTEO_LIMIT = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoteGlobalDetailPage() {
  const params = useParams();
  const loteId = params.loteId as string;

  // Detail data
  const [detail, setDetail] = useState<LoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeline selection
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Calibres tab
  const [chartData, setChartData] = useState<CaliberDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"quantity" | "percentage">(
    "quantity"
  );

  // Datos tab
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [conteosLoading, setConteosLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Active session timer
  const [elapsed, setElapsed] = useState<string>("");

  // ── Fetch detail ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loteId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/lotes/${loteId}/detail`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Lote no encontrado");
        return res.json();
      })
      .then((data: LoteDetail) => setDetail(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loteId]);

  // ── Active session timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!detail?.activeSessions?.length) return;
    const session = detail.activeSessions[0];
    setElapsed(getRelativeTime(session.startTime));
    const interval = setInterval(() => {
      setElapsed(getRelativeTime(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [detail?.activeSessions]);

  // ── Determine active step in lifecycle ──────────────────────────────────────
  const activeStepIndex = useMemo(() => {
    if (!detail) return undefined;
    if (detail.activeSessions.length > 0 && detail.lifecycle.length > 0) {
      return detail.lifecycle.length - 1;
    }
    return undefined;
  }, [detail]);

  // ── Fetch calibres based on selected step ───────────────────────────────────
  const selectedServicioId = useMemo(() => {
    if (selectedStep === null || !detail) return null;
    return detail.lifecycle[selectedStep]?.servicioId ?? null;
  }, [selectedStep, detail]);

  useEffect(() => {
    if (!loteId) return;
    setChartLoading(true);
    const params = new URLSearchParams({ loteId });
    if (selectedServicioId) params.set("servicioId", selectedServicioId);

    fetch(`/api/stats/distribution?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar distribucion");
        const payload: DistributionResponse = await res.json();
        setChartData(payload.data);
      })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [loteId, selectedServicioId]);

  // ── Fetch conteos ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loteId) return;
    setConteosLoading(true);
    fetch(`/api/conteos?loteId=${loteId}&limit=${CONTEO_LIMIT}&skip=${skip}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar datos");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = await res.json();
        const data: Conteo[] = raw.map((r, i) => ({
          id: r.id ?? `${skip + i}`,
          hora: r.timestamp ?? r.hora ?? r.ts,
          direction: r.direction,
          dispositivo: r.dispositivo,
          perimetro: r.perimetro ?? r.perimeter ?? 0,
        }));
        setConteos(data);
        setHasMore(data.length === CONTEO_LIMIT);
      })
      .catch(() => setConteos([]))
      .finally(() => setConteosLoading(false));
  }, [loteId, skip]);

  // ── Derived chart data ──────────────────────────────────────────────────────
  const loteTotal = useMemo(() => {
    let total = 0;
    chartData.forEach((point) => {
      if (typeof point[loteId] === "number") total += point[loteId];
    });
    return total;
  }, [chartData, loteId]);

  const displayData = useMemo(() => {
    if (viewMode === "quantity") return chartData;
    return chartData.map((point) => {
      const val = point[loteId];
      const pct =
        typeof val === "number" && loteTotal > 0
          ? (val / loteTotal) * 100
          : 0;
      return { perimeter: point.perimeter, [loteId]: pct };
    });
  }, [chartData, viewMode, loteId, loteTotal]);

  const series = useMemo<CaliberSeries[]>(
    () => [
      {
        key: loteId,
        label: detail?.codigoLote ?? `Lote ${loteId.slice(-8)}`,
        color: SERIES_COLORS[0],
      },
    ],
    [loteId, detail?.codigoLote]
  );

  // ── Excel export ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const rows = conteos.map((c) => ({
      Hora: new Date(c.hora).toLocaleString("es-CL"),
      Direccion: c.direction,
      Dispositivo: c.dispositivo,
      Perimetro: c.perimetro,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `lote-${detail?.codigoLote ?? loteId.slice(-8)}-datos.xlsx`);
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400 text-sm">
          {error ?? "Lote no encontrado"}
        </div>
      </div>
    );
  }

  const totalBulbs = detail.totalStats.totalIn + detail.totalStats.totalOut;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Back link */}
      <Link
        href="/app/lotes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Lotes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">
              {detail.codigoLote ?? loteId.slice(-8)}
            </h1>
            {detail.productoNombre && (
              <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/40">
                {detail.productoNombre}
              </Badge>
            )}
            {detail.variedadTipo && (
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40">
                {detail.variedadTipo}
              </Badge>
            )}
            {detail.variedadNombre && (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                {detail.variedadNombre}
              </Badge>
            )}
            {detail.activeSessions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Activo - {elapsed}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Creado el{" "}
            {new Date(detail.createdAt).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Total stats */}
        <div className="flex gap-4 shrink-0">
          <div className="text-right">
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {formatNumber(totalBulbs)}
            </p>
            <p className="text-xs text-slate-500">bulbos totales</p>
          </div>
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">
            Ciclo de Vida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoteLifecycleTimeline
            steps={detail.lifecycle}
            activeStepIndex={activeStepIndex}
            selectedStepIndex={selectedStep}
            onStepClick={(idx) =>
              setSelectedStep(selectedStep === idx ? null : idx)
            }
          />
          {selectedStep !== null && detail.lifecycle[selectedStep] && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-white/5 text-xs text-slate-400">
              Mostrando datos de:{" "}
              <span className="text-cyan-400 font-medium">
                {detail.lifecycle[selectedStep].servicioNombre}
              </span>
              {" - "}
              {detail.lifecycle[selectedStep].tipoProcesoNombre ?? "Sin proceso"}
              <button
                onClick={() => setSelectedStep(null)}
                className="ml-2 text-slate-500 hover:text-white transition-colors"
              >
                (ver todo)
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="bg-slate-800/60 border border-white/10">
          <TabsTrigger
            value="resumen"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="calibres"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Calibres
          </TabsTrigger>
          <TabsTrigger
            value="datos"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Datos
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Resumen ───────────────────────────────────────────────────── */}
        <TabsContent value="resumen">
          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Resumen de dispositivos
                </CardTitle>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                  Total: {formatNumber(totalBulbs)} bulbos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {detail.devices.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Sin datos de dispositivos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="text-left py-2 pr-4 font-medium">
                          Dispositivo
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          Entradas
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          Salidas
                        </th>
                        <th className="text-right py-2 font-medium">
                          Ultima actividad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detail.devices.map((d) => (
                        <tr key={d.dispositivoNombre} className="text-white">
                          <td className="py-2.5 pr-4 font-medium">
                            {d.dispositivoNombre}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-green-400">
                            {formatNumber(d.totalIn)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-red-400">
                            {formatNumber(d.totalOut)}
                          </td>
                          <td className="py-2.5 text-right text-slate-400 text-xs">
                            {d.lastTs
                              ? new Date(d.lastTs).toLocaleString("es-CL")
                              : "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Active sessions */}
              {detail.activeSessions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Sesiones activas
                  </h3>
                  <div className="space-y-2">
                    {detail.activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/10"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-sm text-white">
                          {session.dispositivoNombre}
                        </span>
                        <span className="text-xs text-slate-500 ml-auto">
                          Inicio:{" "}
                          {new Date(session.startTime).toLocaleString("es-CL")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Calibres ──────────────────────────────────────────────────── */}
        <TabsContent value="calibres">
          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-white">
                Distribucion por calibre
                {selectedStep !== null && detail.lifecycle[selectedStep] && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({detail.lifecycle[selectedStep].servicioNombre})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("quantity")}
                  className={
                    viewMode === "quantity"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }
                >
                  Cantidad
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("percentage")}
                  className={
                    viewMode === "percentage"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }
                >
                  %
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="h-[360px] bg-slate-800/40 rounded animate-pulse" />
              ) : chartData.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay datos de distribucion disponibles.
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
        </TabsContent>

        {/* ── Tab: Datos ─────────────────────────────────────────────────────── */}
        <TabsContent value="datos">
          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Datos de conteo</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={conteos.length === 0}
                  className="border-white/20 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Descargar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {conteosLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded bg-slate-800/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : conteos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin registros.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="text-left py-2 pr-4 font-medium">
                          Hora
                        </th>
                        <th className="text-left py-2 pr-4 font-medium">
                          Direccion
                        </th>
                        <th className="text-left py-2 pr-4 font-medium">
                          Dispositivo
                        </th>
                        <th className="text-right py-2 font-medium">
                          Perimetro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {conteos.map((c) => (
                        <tr
                          key={c.id}
                          className="text-white hover:bg-slate-800/30"
                        >
                          <td className="py-2 pr-4 text-xs text-slate-400">
                            {new Date(c.hora).toLocaleString("es-CL")}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge
                              className={
                                c.direction === "in"
                                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                                  : "bg-red-500/20 text-red-300 border-red-500/30"
                              }
                            >
                              {c.direction}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-slate-300">
                            {c.dispositivo}
                          </td>
                          <td className="py-2 text-right font-mono text-cyan-300">
                            {(c.perimetro ?? 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Registros {skip + 1}–{skip + conteos.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={skip === 0 || conteosLoading}
                    onClick={() =>
                      setSkip((prev) => Math.max(0, prev - CONTEO_LIMIT))
                    }
                    className="border-white/20 text-slate-300 hover:bg-slate-700"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore || conteosLoading}
                    onClick={() => setSkip((prev) => prev + CONTEO_LIMIT)}
                    className="border-white/20 text-slate-300 hover:bg-slate-700"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
