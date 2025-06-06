// app/dashboard/page.tsx

"use client";
import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { Summary, ResumenLote } from "@/components/app/lotes/resumenlote";
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

  // Resumen por lote (ahora Summary[] | null)
  const [summary, setSummary] = useState<Summary[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  // Datos por lote
  const [records, setRecords] = useState<ConteoRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorRecords, setErrorRecords] = useState<string | null>(null);

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

  // 2) Función para recargar el resumen de un lote (Summary[])
  const fetchSummaryData = useCallback(() => {
    if (!selectedLote) {
      setSummary(null);
      setErrorSummary(null);
      return;
    }

    setLoadingSummary(true);
    setErrorSummary(null);

    fetch(`/api/lotes/summary?loteId=${selectedLote.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar resumen");
        return res.json();
      })
      .then((arr: Summary[]) => {
        setSummary(arr);
      })
      .catch((err) => setErrorSummary(err.message))
      .finally(() => setLoadingSummary(false));
  }, [selectedLote]);

  // 3) useEffect para invocar fetchSummaryData cuando cambie selectedLote
  useEffect(() => {
    // cada vez que cambie de lote, cargo el nuevo resumen
    if (selectedLote) {
      fetchSummaryData();
    } else {
      setSummary(null);
      setErrorSummary(null);
    }
  }, [selectedLote, fetchSummaryData]);

  // 4) Función para recargar los registros de conteo (ConteoRecord[])
  const fetchRecordsData = useCallback(() => {
    if (!selectedLote || !data) {
      setRecords([]);
      return;
    }

    setDataLoading(true);
    setErrorRecords(null);

    fetch(`/api/conteos?empresaId=${data.empresaId}&loteId=${selectedLote.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los registros");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => {
        // Ordenamos de más reciente a más antiguo según el campo timestamp
        const sortedArr = arr.sort((a, b) => {
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
        setRecords(sortedArr);
      })
      .catch((err) => setErrorRecords(err.message))
      .finally(() => setDataLoading(false));
  }, [selectedLote, data]);

  // 5) useEffect para invocar fetchRecordsData cuando cambie selectedLote
  useEffect(() => {
    // cada vez que cambie de lote, cargo los registros
    if (selectedLote) {
      fetchRecordsData();
    } else {
      setRecords([]);
      setErrorRecords(null);
    }
  }, [selectedLote, fetchRecordsData]);

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

  // 7) Función para exportar Excel de datos por lote
  const downloadExcel = () => {
    if (records.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    const sheetData = records.map((r) => ({
      Hora: new Date(r.timestamp).toLocaleString("es-CL"),
      Conteo: r.count_in + r.count_out,
      Dispositivo: r.dispositivo,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conteos");
    XLSX.writeFile(
      wb,
      `conteos_${selectedLote?.nombre || "sin_lote"}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.xlsx`
    );
  };

  // ============== Renderizado ==============
  if (authLoading) return <div>Cargando…</div>;
  if (!data) return <div>No estás autenticado.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Hola {data.name}!</h1>

      <h2 className="text-xl font-semibold">Datos totales</h2>
      <p className="mt-1">Total conteos: {totalSum}</p>
      <p className="mb-4">Lote activo: {activeLote ? activeLote.nombre : "Ninguno"}</p>

      <div className="mb-8 space-y-4">
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
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
      </div>

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

          {/* Sub-pestañas: Resumen y Datos */}
          <Tabs defaultValue="resumen">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="datos">Datos</TabsTrigger>
            </TabsList>

            {/* -------------------------------------------------- */}
            {/* Resumen por Lote */}
            <TabsContent value="resumen">
              {!selectedLote ? (
                <p className="text-center py-4">
                  Selecciona primero un lote para ver el resumen.
                </p>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={fetchSummaryData}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      🔄 Refrescar Resumen
                    </button>
                  </div>
                  <ResumenLote
                    summary={summary}
                    loading={loadingSummary}
                    error={errorSummary}
                  />
                </>
              )}
            </TabsContent>

            {/* -------------------------------------------------- */}
            {/* Datos por Lote */}
            <TabsContent value="datos">
              {!selectedLote ? (
                <p className="text-center py-4">
                  Selecciona primero un lote para ver los datos.
                </p>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Datos de Conteos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-4">
                      <div>Total registros: {records.length}</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={fetchRecordsData}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          🔄 Refrescar Datos
                        </button>
                        <button
                          onClick={downloadExcel}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Descargar Excel
                        </button>
                      </div>
                    </div>

                    {dataLoading ? (
                      <p>Cargando datos…</p>
                    ) : errorRecords ? (
                      <p className="text-red-600">{errorRecords}</p>
                    ) : (
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
                            {records.map((r) => (
                              <tr key={r._id}>
                                <td className="px-4 py-2">
                                  {new Date(r.timestamp).toLocaleString(
                                    "es-CL"
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {r.count_in + r.count_out}
                                </td>
                                <td className="px-4 py-2">{r.dispositivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
