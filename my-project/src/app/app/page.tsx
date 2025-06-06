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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Define aquí la forma de cada registro de conteo
interface ConteoRecord {
  _id: string;
  timestamp: string;
  count_in: number;
  count_out: number;
  dispositivo: string;
  // puedes añadir más campos si tu API los devuelve
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
  const [range, setRange] = useState<"today" | "last3" | "week" | "month">(
    "today"
  );

  // ============== Funciones de carga (fetch) ==============

  // 1) Carga lotes al montar o cuando cambia `data`
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


  // 6) Carga datos totales de la empresa
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
    const now = new Date();
    let start = new Date();
    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "last3":
        start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    return totalRecords.filter((r) => new Date(r.timestamp) >= start);
  }, [totalRecords, range]);

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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Datos totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Conteo total */}
          <div>
            <h3 className="text-lg font-medium">Conteo total</h3>
            {loadingTotal ? (
              <p className="text-gray-500">Cargando conteos…</p>
            ) : (
              <p className="text-3xl font-bold text-green-600">{totalSum}</p>
            )}
          </div>

          {/* Lote activo */}
          <div>
            <h3 className="text-lg font-medium mb-2">Lote activo actual</h3>
            {activeLote ? (
              <div className="p-4 rounded-md bg-gray-50">
                <p className="text-xl font-semibold">{activeLote.nombre}</p>
                {activeLote.fechaCreacion && (
                  <p className="text-sm text-gray-500">
                    Creado: {new Date(activeLote.fechaCreacion).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Ningún lote activo</p>
            )}
          </div>

          {/* Gráfico volumen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Volumen por hora</h3>
              <Select
                value={range}
                onValueChange={(v) =>
                  setRange(v as "today" | "last3" | "week" | "month")
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Solo hoy</SelectItem>
                  <SelectItem value="last3">Últimos 3 días</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loadingTotal ? (
              <p className="text-center text-gray-500">Cargando datos…</p>
            ) : volumeData.length === 0 ? (
              <p className="text-center text-gray-500">
                No hay datos registrados para este periodo
              </p>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="volumen" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pestañas principales: Totales y Por Lote */}
      <Tabs defaultValue="datosTotales">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="datosTotales">Datos Totales</TabsTrigger>
          <TabsTrigger value="datosPorLote">Datos por Lote</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------ */}
        {/* DATOS TOTALES */}
        <TabsContent value="datosTotales">
          {loadingTotal ? (
            <p>Cargando datos totales…</p>
          ) : errorTotal ? (
            <p className="text-red-600">{errorTotal}</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Datos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                          Hora
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                          Conteo
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                          Dispositivo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {totalRecords.map((rec) => (
                        <tr key={rec._id}>
                          <td className="px-4 py-2">
                            {new Date(rec.timestamp).toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-2">
                            {rec.count_in + rec.count_out}
                          </td>
                          <td className="px-4 py-2">{rec.dispositivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
