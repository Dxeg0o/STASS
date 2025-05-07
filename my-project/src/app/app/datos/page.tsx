"use client";

import React, { useContext, useState, useEffect } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { Summary, ResumenLote } from "@/components/app/lotes/resumenlote";

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const [records, setRecords] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // 1. Carga inicial de lotes
  useEffect(() => {
    if (!data) return;
    setLoadingLotes(true);
    fetch(`/api/lotes?empresaId=${data.empresaId}`)
      .then((res) => res.json())
      .then((arr: Lote[]) => setLotes(arr))
      .catch(console.error)
      .finally(() => setLoadingLotes(false));
  }, [data]);

  // 2. Fetch de resumen al cambiar lote
  useEffect(() => {
    if (!selectedLote) {
      setSummary(null);
      setErrorSummary(null);
      return;
    }
    setLoadingSummary(true);
    fetch(`/api/lotes/summary?loteId=${selectedLote.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el resumen");
        return res.json();
      })
      .then((json: Summary) => setSummary(json))
      .catch((err) => setErrorSummary(err.message))
      .finally(() => setLoadingSummary(false));
  }, [selectedLote]);

  // 3. Fetch de registros al cambiar lote
  useEffect(() => {
    if (!selectedLote) {
      setRecords([]);
      return;
    }
    setDataLoading(true);
    fetch(
      `/api/conteos?empresaId=${data?.empresaId}` +
        (selectedLote ? `&loteId=${selectedLote.id}` : "")
    )
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los conteos");
        return res.json();
      })
      .then((json: any[]) => setRecords(json))
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [selectedLote]);

  // 4. Función de descarga de Excel
  const downloadExcel = () => {
    if (records.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    // mapeamos registros a columnas más legibles
    const sheetData = records.map((rec) => ({
      Horario: new Date(rec.timestamp).toLocaleString("es-CL"),
      Conteos: rec.count_in + rec.count_out,
      Dispositivo: rec.dispositivo,
    }));

    // creamos la hoja y el libro
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conteos");

    // disparamos la descarga
    XLSX.writeFile(
      wb,
      `conteos_${selectedLote?.nombre || "sin_lote"}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.xlsx`
    );
  };

  if (authLoading) return <div>Cargando…</div>;
  if (!data) return <div>No estás autenticado.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Datos por lotes</h1>

      {/* Selector de lotes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Control de Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumenLoteSelector
            lotes={lotes}
            selectedLote={selectedLote}
            loading={loadingLotes}
            onSelect={(lote) => setSelectedLote(lote)}
            onSelectNone={() => setSelectedLote(null)}
            onCreate={async (nombre) => {
              if (!data) return;
              const res = await fetch("/api/lotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, empresaId: data.empresaId }),
              });
              if (res.ok) {
                const nuevo: Lote = await res.json();
                setLotes((prev) => [nuevo, ...prev]);
                setSelectedLote(nuevo);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Pestañas */}
      <Tabs defaultValue="resumen">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="resumen">
          <ResumenLote
            summary={summary}
            loading={loadingSummary}
            error={errorSummary}
          />
        </TabsContent>

        {/* Datos + botón Excel */}
        <TabsContent value="datos">
          <Card>
            <CardHeader>
              <CardTitle>Datos de Conteos</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <p>Cargando datos…</p>
              ) : (
                <>
                  <div className="flex justify-between mb-4">
                    <div>Total registros: {records.length}</div>
                    <button
                      onClick={downloadExcel}
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Descargar Excel
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Hora
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Conteo
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Dispositivo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {records.map((rec) => (
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="graficos">
          {/* Aquí puedes renderizar tus gráficos con Recharts */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
