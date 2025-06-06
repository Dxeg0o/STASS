"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { SummaryLote } from "./summarylote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

interface ConteoRecord {
  _id: string;
  timestamp: string;
  count_in: number;
  count_out: number;
  dispositivo: string;
}

interface LoteTabsProps {
  loteId: string | null;
}

export function LoteTabs({ loteId }: LoteTabsProps) {
  const { data } = useContext(AuthenticationContext);

  const [records, setRecords] = useState<ConteoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordsData = useCallback(() => {
    if (!loteId || !data) {
      setRecords([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/conteos?empresaId=${data.empresaId}&loteId=${loteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los registros");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => {
        const sorted = arr.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRecords(sorted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loteId, data]);

  useEffect(() => {
    fetchRecordsData();
  }, [fetchRecordsData]);

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
      `conteos_${loteId || "sin_lote"}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.xlsx`
    );
  };

  if (!loteId) {
    return (
      <p className="text-center py-4">
        Selecciona primero un lote para ver el resumen.
      </p>
    );
  }

  return (
    <Tabs defaultValue="resumen">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="datos">Datos</TabsTrigger>
      </TabsList>

      <TabsContent value="resumen">
        <SummaryLote loteId={loteId} />
      </TabsContent>

      <TabsContent value="datos">
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

            {loading ? (
              <p>Cargando datos…</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
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
                          {new Date(r.timestamp).toLocaleString("es-CL")}
                        </td>
                        <td className="px-4 py-2">{r.count_in + r.count_out}</td>
                        <td className="px-4 py-2">{r.dispositivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
