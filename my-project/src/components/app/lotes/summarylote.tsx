// components/app/lotes/SummaryLote.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Summary {
  dispositivo: string;
  countIn: number;
  countOut: number;
  lastTimestamp: string | null;
  servicioId: string;
}

interface SummaryLoteProps {
  loteId: string;
  /**
   * Opcional: si cambia este valor se volverá a solicitar el resumen.
   * Permite que un componente padre fuerce la recarga sin cambiar el lote.
   */
  refreshKey?: number;
}

export function SummaryLote({ loteId, refreshKey }: SummaryLoteProps) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loteId) {
      setSummaries([]);
      return;
    }
    setLoading(true);
    setError(null);

    fetch(`/api/lotes/summary?loteId=${loteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar el resumen");
        return res.json();
      })
      .then((data: Summary[]) => {
        setSummaries(data);
      })
      .catch((err) => {
        setError(err.message);
        setSummaries([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loteId, refreshKey]);

  // Calcular el total de bulbos de todo el lote (suma de countIn + countOut por dispositivo)
  const totalBulbos = summaries.reduce(
    (acc, row) => acc + (row.countIn + row.countOut),
    0
  );

  if (!loteId) {
    return (
      <p className="text-center text-gray-500">
        Selecciona primero un lote para ver el resumen.
      </p>
    );
  }

  if (loading) {
    return <p className="text-center">Cargando resumen…</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (summaries.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No se encontró información para este lote.
      </p>
    );
  }

  return (
    <Card className="w-full bg-white shadow rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Resumen por Dispositivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xl font-bold">
            Total Bulbos Lote:{" "}
            <span className="text-green-600">{totalBulbos}</span>
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Dispositivo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ingresos
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Último Conteo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Servicio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaries.map((row) => {
                const fechaLocal = row.lastTimestamp
                  ? new Date(row.lastTimestamp).toLocaleString("es-CL", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                // Ingresos = countIn + countOut
                const ingresos = row.countIn + row.countOut;

                return (
                  <tr key={row.dispositivo}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.dispositivo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {ingresos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                      {fechaLocal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                      {row.servicioId || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
