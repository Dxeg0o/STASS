// app/dashboard/page.tsx

"use client";
import React, { useContext, useState, useEffect, useMemo } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
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
  count_in: number;
  count_out: number;
  dispositivo: string;
}

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  // Estados para lotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

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
    if (!data) return;
    setLoadingLotes(true);
    fetch(`/api/lotes?empresaId=${data.empresaId}`)
      .then((res) => res.json())
      .then((arr: Lote[]) => setLotes(arr))
      .catch((err) => console.error(err))
      .finally(() => setLoadingLotes(false));
  }, [data]);

  // Lote activo actual de la empresa
  useEffect(() => {
    if (!data) return;
    fetch(`/api/lotes/activity/last?empresaId=${data.empresaId}`)
      .then((res) => res.json())
      .then((l: Lote | null) => setActiveLote(l))
      .catch(() => setActiveLote(null));
  }, [data]);

  //  Carga datos totales de la empresa
  useEffect(() => {
    if (!data) return;
    setLoadingTotal(true);
    fetch(`/api/conteos?empresaId=${data.empresaId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar datos totales");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => setTotalRecords(arr))
      .catch((err) => setErrorTotal(err.message))
      .finally(() => setLoadingTotal(false));
  }, [data]);

  // Calcular suma total de conteos
  useEffect(() => {
    const sum = totalRecords.reduce(
      (acc, r) => acc + r.count_in + r.count_out,
      0
    );
    setTotalSum(sum);
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
    return filteredRecords.reduce(
      (acc, r) => acc + r.count_in + r.count_out,
      0
    );
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
      map.set(key, (map.get(key) ?? 0) + r.count_in + r.count_out);
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

  // ============== Renderizado ==============
  if (authLoading) return <div>Cargando…</div>;
  if (!data) return <div>No estás autenticado.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Hola {data.name}!</h1>

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
            <p className="text-center text-gray-500">Cargando datos totales…</p>
          ) : errorTotal ? (
            <p className="text-red-600">{errorTotal}</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Conteo total */}
                <div>
                  <h3 className="text-lg font-medium">Conteo total</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {totalSum}
                  </p>
                </div>

                {/* Lote activo */}
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Lote activo actual
                  </h3>
                  {activeLote ? (
                    <div className="p-4 rounded-md bg-gray-50">
                      <p className="text-xl font-semibold">
                        {activeLote.nombre}
                      </p>
                      {activeLote.fechaCreacion && (
                        <p className="text-sm text-gray-500">
                          Creado:{" "}
                          {new Date(
                            activeLote.fechaCreacion
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Ningún lote activo</p>
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
                        <p className="text-sm text-gray-500">Conteo total en rango</p>
                        <p className="text-xl font-semibold text-green-600">
                          {totalRangeCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{startInfo.label}</p>
                        <p className="text-xl font-semibold text-green-600">
                          {startInfo.value}
                        </p>
                      </div>
                    </div>
                  )}

                  {volumeData.length === 0 ? (
                    <p className="text-center text-gray-500">
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
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hora" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="volumen"
                            stroke="#8884d8"
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

          <LoteDataTabs empresaId={data.empresaId} lote={selectedLote} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
