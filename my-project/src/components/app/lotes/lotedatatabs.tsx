"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryLote } from "@/components/app/lotes/summarylote";
import * as XLSX from "xlsx";
import { Lote } from "./loteselector";

interface ConteoRecord {
  _id: string;
  timestamp: string;
  direction: "in" | "out";
  dispositivo: string;
  id: number;
  perimeter: number;
}

interface LoteDataTabsProps {
  empresaId: string;
  lote: Lote | null;
}

export function LoteDataTabs({ empresaId, lote }: LoteDataTabsProps) {
  const [records, setRecords] = useState<ConteoRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorRecords, setErrorRecords] = useState<string | null>(null);
  const [refreshSummary, setRefreshSummary] = useState(0);

  const fetchRecordsData = useCallback(() => {
    if (!lote) {
      setRecords([]);
      return;
    }
    setDataLoading(true);
    setErrorRecords(null);
    fetch(`/api/conteos?empresaId=${empresaId}&loteId=${lote.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los registros");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => {
        const sortedArr = arr.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRecords(sortedArr);
      })
      .catch((err) => setErrorRecords(err.message))
      .finally(() => setDataLoading(false));
  }, [empresaId, lote]);

  useEffect(() => {
    if (lote) {
      fetchRecordsData();
    } else {
      setRecords([]);
      setErrorRecords(null);
    }
  }, [lote, fetchRecordsData]);

  const downloadExcel = () => {
    if (records.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    const sheetData = records.map((r) => ({
      Hora: new Date(r.timestamp).toLocaleString("es-CL"),
      Direccion: r.direction,
      Dispositivo: r.dispositivo,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conteos");
    XLSX.writeFile(
      wb,
      `conteos_${lote?.nombre || "sin_lote"}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.xlsx`
    );
  };

  return (
    <Tabs defaultValue="resumen">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="datos">Datos</TabsTrigger>
      </TabsList>

      <TabsContent value="resumen">
        {!lote ? (
          <p className="text-center py-4">
            Selecciona primero un lote para ver el resumen.
          </p>
        ) : (
          <>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setRefreshSummary((r) => r + 1)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                🔄 Refrescar Resumen
              </button>
            </div>
            <SummaryLote loteId={lote.id} refreshKey={refreshSummary} />
          </>
        )}
      </TabsContent>

      <TabsContent value="datos">
        {!lote ? (
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
                          Dirección
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
                            {new Date(r.timestamp).toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-2">{r.direction}</td>
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
  );
}

