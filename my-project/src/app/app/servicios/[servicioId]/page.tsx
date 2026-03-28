"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveLote {
  id: string;
}

interface Device {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface RecentLote {
  id: string;
  totalCount: number;
  lastTs: string | null;
  variedadNombre: string | null;
  productoNombre: string | null;
  createdAt: string | null;
}

interface ServicioDetail {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  totalCount: number;
  loteCount: number;
  activeLote: ActiveLote | null;
  devices: Device[];
  recentLotes: RecentLote[];
}

interface ConteoRecord {
  timestamp: string;
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

function tipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ServicioDetailPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;

  const [detail, setDetail] = useState<ServicioDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [conteos, setConteos] = useState<ConteoRecord[]>([]);
  const [loadingConteos, setLoadingConteos] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  // ── Fetch detail ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!servicioId) return;
    setLoadingDetail(true);
    fetch(`/api/servicios/${servicioId}/detail`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar el servicio");
        return res.json();
      })
      .then((data: ServicioDetail) => setDetail(data))
      .catch((err: Error) => setErrorDetail(err.message))
      .finally(() => setLoadingDetail(false));
  }, [servicioId]);

  // ── Fetch conteos for chart ───────────────────────────────────────────────────

  useEffect(() => {
    if (!servicioId) return;
    setLoadingConteos(true);
    fetch(`/api/conteos?servicioId=${servicioId}&limit=5000`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar conteos");
        return res.json();
      })
      .then((data: ConteoRecord[]) => setConteos(data))
      .catch(() => setConteos([]))
      .finally(() => setLoadingConteos(false));
  }, [servicioId]);

  // ── Volume chart data ─────────────────────────────────────────────────────────

  const filteredConteos = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);
    return conteos.filter((r) => {
      const d = new Date(r.timestamp);
      return d >= start && d <= end;
    });
  }, [conteos, dateRange]);

  const volumeData = useMemo(() => {
    const map = new Map<number, number>();
    filteredConteos.forEach((r) => {
      const d = new Date(r.timestamp);
      d.setMinutes(0, 0, 0);
      const key = d.getTime();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, count]) => ({
        hora: new Date(time).toLocaleString("es-CL", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
        }),
        volumen: count,
      }));
  }, [filteredConteos]);

  // ── Excel download ────────────────────────────────────────────────────────────

  const downloadExcel = async () => {
    try {
      const res = await fetch(`/api/lotes/summary/all?servicioId=${servicioId}`);
      if (!res.ok) throw new Error("Error al obtener resumen");
      const arr: {
        id: string;
        conteo: number;
        firstTimestamp: string | null;
        lastTimestamp: string | null;
      }[] = await res.json();
      const sheetData = arr.map((l) => ({
        Lote: l.id.slice(-8),
        Conteo: l.conteo,
        "Primer conteo": l.firstTimestamp
          ? format(new Date(l.firstTimestamp), "yyyy-MM-dd HH:mm")
          : "",
        "Último conteo": l.lastTimestamp
          ? format(new Date(l.lastTimestamp), "yyyy-MM-dd HH:mm")
          : "",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData, {
        header: ["Lote", "Conteo", "Primer conteo", "Último conteo"],
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      XLSX.writeFile(
        wb,
        `resumen_lotes_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el Excel");
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Cargando servicio...
      </div>
    );
  }

  if (errorDetail || !detail) {
    return (
      <div className="text-red-400 bg-red-950/20 p-4 rounded border border-red-500/20">
        {errorDetail ?? "No se encontró el servicio."}
      </div>
    );
  }

  const devicesOnline = detail.devices.filter((d) => d.activo).length;

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {detail.nombre}
          </h1>
          <Badge
            variant="outline"
            className="border-cyan-500/40 text-cyan-400 text-sm"
          >
            {tipoLabel(detail.tipo)}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">
          {detail.fechaInicio
            ? `Desde ${format(new Date(detail.fechaInicio), "dd/MM/yyyy")}`
            : "Sin fecha de inicio"}
          {detail.fechaFin
            ? ` — Hasta ${format(new Date(detail.fechaFin), "dd/MM/yyyy")}`
            : " — En curso"}
        </p>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total conteo */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Total conteo</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {detail.totalCount.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        {/* Lote count */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Lotes totales</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {detail.loteCount.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        {/* Active lote */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Lote activo</p>
            {detail.activeLote ? (
              <p className="text-xl font-semibold text-white truncate">
                {detail.activeLote.id.slice(-8)}
              </p>
            ) : (
              <p className="text-slate-500 italic text-sm">Sin lote activo</p>
            )}
          </CardContent>
        </Card>

        {/* Devices online */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Dispositivos en línea</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {devicesOnline}
              <span className="text-2xl text-slate-500">/{detail.devices.length}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Volume Chart ── */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-white">
              Volumen por hora
            </CardTitle>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {loadingConteos ? (
            <p className="text-center text-slate-500 py-12">Cargando datos...</p>
          ) : volumeData.length === 0 ? (
            <p className="text-center text-slate-500 py-12">
              No hay datos registrados para este periodo
            </p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="hora"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    itemStyle={{ color: "#22d3ee" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="volumen"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: "#0f172a", stroke: "#22d3ee", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#22d3ee", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Lotes Table ── */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white">
              Lotes recientes
            </CardTitle>
            <Link
              href={`/app/servicios/${servicioId}/lotes`}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Ver todos los lotes →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {detail.recentLotes.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay lotes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                    <th className="text-left py-2 pr-4 font-medium">Variedad</th>
                    <th className="text-right py-2 pr-4 font-medium">Conteo</th>
                    <th className="text-left py-2 pr-4 font-medium">Último conteo</th>
                    <th className="text-left py-2 font-medium">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentLotes.map((lote) => (
                    <tr
                      key={lote.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/app/servicios/${servicioId}/lotes/${lote.id}`}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                        >
                          {lote.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {lote.variedadNombre
                          ? `${lote.productoNombre ? lote.productoNombre + " — " : ""}${lote.variedadNombre}`
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="py-3 pr-4 text-right text-white font-semibold">
                        {lote.totalCount.toLocaleString("es-CL")}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {lote.lastTs
                          ? format(new Date(lote.lastTs), "dd/MM/yyyy HH:mm")
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="py-3 text-slate-400">
                        {lote.createdAt
                          ? format(new Date(lote.createdAt), "dd/MM/yyyy")
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Devices Section ── */}
      {detail.devices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Dispositivos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.devices.map((device) => (
              <Card key={device.id} className="bg-slate-900/40 border-white/10">
                <CardContent className="py-4 flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      device.activo ? "bg-emerald-400" : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {device.nombre}
                    </p>
                    <p className="text-xs text-slate-400">{device.tipo}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs flex-shrink-0 ${
                      device.activo
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-red-500/40 text-red-400"
                    }`}
                  >
                    {device.activo ? "En línea" : "Fuera de línea"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/app/servicios/${servicioId}/calibres`}
          className="px-4 py-2 bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-950/60 transition-colors text-sm font-medium hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
          Ver calibres
        </Link>
        <button
          onClick={downloadExcel}
          className="px-4 py-2 bg-slate-800/60 text-slate-300 border border-white/10 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}
