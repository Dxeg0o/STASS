"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  CaliberChart,
  CaliberDataPoint,
  CaliberSeries,
} from "@/components/CaliberChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lote {
  id: string;
  nombre: string;
  fechaCreacion: string;
  servicioId: string;
  variedadId?: string;
  variedadNombre?: string;
  productoNombre?: string;
}

interface DeviceSummary {
  device: string;
  countIn: number;
  countOut: number;
  lastTimestamp: string | null;
}

interface SummaryResponse {
  devices: DeviceSummary[];
  totalBulbs: number;
}

interface Conteo {
  id: string;
  hora: string;
  direction: string;
  dispositivo: string;
  perimetro: number;
}

interface DistributionResponse {
  data: CaliberDataPoint[];
  series: { loteId: string }[];
}

const SERIES_COLORS = ["#06b6d4", "#6366f1", "#f97316", "#10b981", "#ec4899"];

const LIMIT = 100;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoteDetailPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;
  const loteId = params.loteId as string;

  // Lote info
  const [lote, setLote] = useState<Lote | null>(null);
  const [loteLoading, setLoteLoading] = useState(true);

  // Resumen tab
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Calibres tab
  const [chartData, setChartData] = useState<CaliberDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"quantity" | "percentage">("quantity");

  // Datos tab
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [conteosLoading, setConteosLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ── Fetch lote info ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!servicioId || !loteId) return;
    setLoteLoading(true);
    fetch(`/api/lotes?servicioId=${servicioId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar lotes");
        const data: Lote[] = await res.json();
        const found = data.find((l) => l.id === loteId) ?? null;
        setLote(found);
      })
      .catch(console.error)
      .finally(() => setLoteLoading(false));
  }, [servicioId, loteId]);

  // ── Fetch resumen ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loteId) return;
    setSummaryLoading(true);
    fetch(`/api/lotes/summary?loteId=${loteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar resumen");
        const data: SummaryResponse = await res.json();
        setSummary(data);
      })
      .catch(console.error)
      .finally(() => setSummaryLoading(false));
  }, [loteId]);

  // ── Fetch calibres ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!servicioId || !loteId) return;
    setChartLoading(true);
    fetch(`/api/stats/distribution?servicioId=${servicioId}&loteId=${loteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar distribución");
        const payload: DistributionResponse = await res.json();
        setChartData(payload.data);
      })
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [servicioId, loteId]);

  // ── Fetch conteos (paginated) ──────────────────────────────────────────────
  useEffect(() => {
    if (!loteId) return;
    setConteosLoading(true);
    fetch(`/api/conteos?loteId=${loteId}&limit=${LIMIT}&skip=${skip}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar datos");
        const data: Conteo[] = await res.json();
        setConteos(data);
        setHasMore(data.length === LIMIT);
      })
      .catch(console.error)
      .finally(() => setConteosLoading(false));
  }, [loteId, skip]);

  // ── Derived: percentage chart data ─────────────────────────────────────────
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
        typeof val === "number" && loteTotal > 0 ? (val / loteTotal) * 100 : 0;
      return { perimeter: point.perimeter, [loteId]: pct };
    });
  }, [chartData, viewMode, loteId, loteTotal]);

  const series = useMemo<CaliberSeries[]>(() => {
    if (!loteId) return [];
    return [
      {
        key: loteId,
        label: lote?.nombre ?? `Lote ${loteId.slice(-4)}`,
        color: SERIES_COLORS[0],
      },
    ];
  }, [loteId, lote]);

  // ── Excel export ───────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const rows = conteos.map((c) => ({
      Hora: new Date(c.hora).toLocaleString("es-CL"),
      Dirección: c.direction,
      Dispositivo: c.dispositivo,
      Perimetro: c.perimetro,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `lote-${loteId}-datos.xlsx`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        {loteLoading ? (
          <div className="h-7 w-48 bg-slate-800/60 rounded animate-pulse" />
        ) : (
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-white">
              {lote?.nombre ?? loteId}
            </h1>
            {lote?.variedadNombre && (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                {lote.variedadNombre}
              </Badge>
            )}
            {lote?.productoNombre && (
              <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/40">
                {lote.productoNombre}
              </Badge>
            )}
          </div>
        )}
        <p className="text-sm text-slate-500">
          <Link
            href={`/app/servicios/${servicioId}/lotes`}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Volver a lotes
          </Link>
        </p>
      </div>

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

        {/* ── Tab: Resumen ─────────────────────────────────────────────────── */}
        <TabsContent value="resumen">
          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Resumen de dispositivos</CardTitle>
                {summary && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                    Total: {summary.totalBulbs.toLocaleString("es-CL")} bulbos
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded bg-slate-800/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : !summary || summary.devices.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos de dispositivos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="text-left py-2 pr-4 font-medium">
                          Dispositivo
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">Entradas</th>
                        <th className="text-right py-2 pr-4 font-medium">Salidas</th>
                        <th className="text-right py-2 font-medium">Última actividad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {summary.devices.map((d) => (
                        <tr key={d.device} className="text-white">
                          <td className="py-2.5 pr-4 font-medium">{d.device}</td>
                          <td className="py-2.5 pr-4 text-right text-green-400">
                            {d.countIn.toLocaleString("es-CL")}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-red-400">
                            {d.countOut.toLocaleString("es-CL")}
                          </td>
                          <td className="py-2.5 text-right text-slate-400 text-xs">
                            {d.lastTimestamp
                              ? new Date(d.lastTimestamp).toLocaleString("es-CL")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Calibres ────────────────────────────────────────────────── */}
        <TabsContent value="calibres">
          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-white">Distribución por calibre</CardTitle>
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
                  No hay datos de distribución disponibles.
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

        {/* ── Tab: Datos ───────────────────────────────────────────────────── */}
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
                        <th className="text-left py-2 pr-4 font-medium">Hora</th>
                        <th className="text-left py-2 pr-4 font-medium">
                          Dirección
                        </th>
                        <th className="text-left py-2 pr-4 font-medium">
                          Dispositivo
                        </th>
                        <th className="text-right py-2 font-medium">Perímetro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {conteos.map((c) => (
                        <tr key={c.id} className="text-white hover:bg-slate-800/30">
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
                            {c.perimetro.toFixed(1)}
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
                    onClick={() => setSkip((prev) => Math.max(0, prev - LIMIT))}
                    className="border-white/20 text-slate-300 hover:bg-slate-700"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore || conteosLoading}
                    onClick={() => setSkip((prev) => prev + LIMIT)}
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
