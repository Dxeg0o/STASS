// app/dashboard/page.tsx

"use client";
import React, { useContext, useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
import { useServicio } from "@/app/context/ServicioContext";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoteDataTabs } from "@/components/app/lotes/lotedatatabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, format } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { motion } from "framer-motion";

// Define aquí la forma de cada registro de conteo
interface ConteoRecord {
  _id: string;
  timestamp: string;
  direction: "in" | "out";
  dispositivo: string;
  id: number;
  perimeter: number;
}

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  // Estados para lotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

  // Servicio seleccionado (global)
  const { selectedServicio } = useServicio();

  // Datos totales de la empresa
  const [totalRecords, setTotalRecords] = useState<ConteoRecord[]>([]);
  const [loadingTotal, setLoadingTotal] = useState(false);
  const [errorTotal, setErrorTotal] = useState<string | null>(null);

  const [activeLote, setActiveLote] = useState<Lote | null>(null);
  const [totalSum, setTotalSum] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  // ============== Funciones de carga (fetch) ==============
  useEffect(() => {
    if (!data || !selectedServicio) return;
    setLoadingLotes(true);
    fetch(`/api/lotes?servicioId=${selectedServicio.id}`)
      .then((res) => res.json())
      .then((arr: Lote[]) => setLotes(arr))
      .catch((err) => console.error(err))
      .finally(() => setLoadingLotes(false));
  }, [data, selectedServicio]);
  // Lote activo actual del servicio
  useEffect(() => {
    if (!data || !selectedServicio) return;
    fetch(`/api/lotes/activity/last?servicioId=${selectedServicio.id}`)
      .then((res) => res.json())
      .then((l: Lote | null) => setActiveLote(l))
      .catch(() => setActiveLote(null));
  }, [data, selectedServicio]);

  //  Carga datos totales de la empresa
  useEffect(() => {
    if (!data) return;
    setLoadingTotal(true);
    const params = new URLSearchParams({ empresaId: data.empresaId });
    if (selectedServicio) params.append("servicioId", selectedServicio.id);
    fetch(`/api/conteos?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar datos totales");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => setTotalRecords(arr))
      .catch((err) => setErrorTotal(err.message))
      .finally(() => setLoadingTotal(false));
  }, [data, selectedServicio]);

  // Calcular suma total de conteos
  useEffect(() => {
    setTotalSum(totalRecords.length);
  }, [totalRecords]);

  const filteredRecords = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);
    return totalRecords.filter((r) => {
      const d = new Date(r.timestamp);
      return d >= start && d <= end;
    });
  }, [totalRecords, dateRange]);

  const totalRangeCount = useMemo(() => {
    return filteredRecords.length;
  }, [filteredRecords]);

  const startInfo = useMemo(() => {
    const map = new Map<string, Date>();
    filteredRecords.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = format(d, "yyyy-MM-dd");
      const current = map.get(key);
      if (!current || d < current) {
        map.set(key, d);
      }
    });

    if (map.size === 0) return null;
    const times = Array.from(map.values());
    if (times.length === 1) {
      return { label: "Hora de inicio", value: format(times[0], "HH:mm") };
    }
    const avgMinutes =
      times.reduce((acc, d) => acc + d.getHours() * 60 + d.getMinutes(), 0) /
      times.length;
    const h = Math.floor(avgMinutes / 60);
    const m = Math.round(avgMinutes % 60);
    const value = `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}`;
    return { label: "Hora promedio de inicio", value };
  }, [filteredRecords]);

  const volumeData = useMemo(() => {
    const map = new Map<number, number>();
    filteredRecords.forEach((r) => {
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
  }, [filteredRecords]);

  const lastOverallTimestamp = useMemo(() => {
    if (totalRecords.length === 0) return null;
    let max = -Infinity;
    for (const r of totalRecords) {
      const t = new Date(r.timestamp).getTime();
      if (t > max) max = t;
    }
    return max !== -Infinity ? new Date(max) : null;
  }, [totalRecords]);


  const downloadSummaryExcel = async () => {
    if (!data) return;
    try {
      const params = new URLSearchParams({ empresaId: data.empresaId });
      if (selectedServicio)
        params.append("servicioId", selectedServicio.id);
      const res = await fetch(
        `/api/lotes/summary/all?${params.toString()}`
      );
      if (!res.ok) throw new Error("Error al obtener resumen");
      const arr: {
        id: string;
        nombre: string;
        conteo: number;
        firstTimestamp: string | null;
        lastTimestamp: string | null;
      }[] = await res.json();
      const sheetData = arr.map((l) => ({
        Lote: l.nombre,
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

  // ============== Renderizado ==============
  if (authLoading) return <div>Cargando…</div>;
  if (!data) return <div>No estás autenticado.</div>;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hola, {data.name}</h1>
          <p className="text-slate-400">Bienvenido a tu panel de control.</p>
        </div>
      </div>

      {/* ------------------------------------------------------ */}
      {/* Pestañas principales: “Datos Totales” y “Datos por Lote” */}
      <Tabs defaultValue="datosTotales">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="datosTotales">Resumen</TabsTrigger>
          <TabsTrigger value="datosPorLote">Datos por Lote</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------ */}
        {/* DATOS TOTALES */}
        <TabsContent value="datosTotales">
          {loadingTotal ? (
            <p className="text-center text-slate-500 py-20">Cargando datos totales...</p>
          ) : errorTotal ? (
            <p className="text-red-400 bg-red-950/20 p-4 rounded border border-red-500/20">{errorTotal}</p>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Resumen</CardTitle>
                  <button
                    onClick={downloadSummaryExcel}
                    className="px-4 py-2 bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-950/60 transition-colors text-sm font-medium hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                  >
                    Descargar Excel
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Conteo total */}
                <div>
                  <h3 className="text-lg font-medium">Conteo total</h3>
                  <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                    {totalSum}
                  </p>
                </div>

                {/* Lote activo */}
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Lote activo actual
                  </h3>
                  {activeLote ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 shadow-inner">
                      <p className="text-xl font-semibold text-white">
                        {activeLote.nombre}
                      </p>
                      {activeLote.fechaCreacion && (
                        <p className="text-sm text-slate-400 mt-1">
                          Creado:{" "}
                          <span className="text-slate-300">{new Date(
                            activeLote.fechaCreacion
                          ).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Ningún lote activo</p>
                  )}
                </div>

                {/* Último conteo */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-slate-200">Último conteo</h3>
                  {lastOverallTimestamp ? (
                    <p className="text-xl font-semibold text-emerald-400">
                      {lastOverallTimestamp.toLocaleString("es-CL")}
                    </p>
                  ) : (
                    <p className="text-slate-500">—</p>
                  )}
                </div>

                {/* Gráfico volumen */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                    <h3 className="text-lg font-medium">Volumen por hora</h3>
                    <DatePickerWithRange
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </div>
                  {startInfo && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-400">Conteo total en rango</p>
                        <p className="text-2xl font-semibold text-cyan-400">
                          {totalRangeCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">{startInfo.label}</p>
                        <p className="text-2xl font-semibold text-emerald-400">
                          {startInfo.value}
                        </p>
                      </div>
                    </div>
                  )}

                  {volumeData.length === 0 ? (
                    <p className="text-center text-slate-500 py-12">
                      No hay datos registrados para este periodo
                    </p>
                  ) : (
                    <motion.div
                      key={`${dateRange?.from}-${dateRange?.to}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-64"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="hora" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                          <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                          <Tooltip 
                            contentStyle={{ 
                                backgroundColor: "rgba(15, 23, 42, 0.9)", 
                                borderColor: "rgba(255,255,255,0.1)", 
                                borderRadius: "8px",
                                color: "#f8fafc" 
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
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------------------------------ */}
        {/* DATOS POR LOTE */}
        <TabsContent value="datosPorLote">
          {/* Selector de lote */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Datos de Conteo por Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumenLoteSelector
                lotes={lotes}
                selectedLote={selectedLote}
                loading={loadingLotes}
                onSelect={(l) => setSelectedLote(l)}
                onSelectNone={() => setSelectedLote(null)}
              />
            </CardContent>
          </Card>

          <LoteDataTabs lote={selectedLote} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
