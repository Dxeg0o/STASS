// app/dashboard/page.tsx

"use client";
import React, { useContext, useState, useEffect, useCallback } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { Summary, ResumenLote } from "@/components/app/lotes/resumenlote";
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
