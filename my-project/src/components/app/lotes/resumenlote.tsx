// components/app/lotes/ResumenLote.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface Summary {
  dispositivo: string;
  countIn: number;
  countOut: number;
  lastTimestamp: string; // vendrá como ISO string
  servicioId: string;
}

interface ResumenLoteProps {
  summary: Summary[] | null;
  loading: boolean;
  error: string | null;
}

export function ResumenLote({ summary, loading, error }: ResumenLoteProps) {
  // 1) Estados de carga / error
  if (loading) {
    return <p className="text-center">Cargando resumen…</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  // 2) Ningún lote seleccionado o sin datos
  if (!summary || summary.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No hay datos de resumen para este lote.
      </p>
    );
  }

  // 3) Calcular el total de "bulbos" (suma de countIn + countOut) en todo el lote
  const totalBulbos = summary.reduce((acc, item) => {
    return acc + item.countIn + item.countOut;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen por Dispositivo</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 3.1) Mostrar total de bulbos en todo el lote */}
        <div className="mb-4">
          <p className="text-lg font-semibold">
            Total Bulbos Lote:{" "}
            <span className="text-2xl font-bold">{totalBulbos}</span>
          </p>
        </div>

        {/* 3.2) Tabla con detalle por dispositivo */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase">
                  Último Conteo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Servicio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.map((item) => {
                // Convertimos el lastTimestamp de ISO string a fecha local ("es-CL")
                const fechaLocal = item.lastTimestamp
                  ? new Date(item.lastTimestamp).toLocaleString("es-CL", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                return (
                  <tr key={item.dispositivo}>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.dispositivo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {item.countIn + item.countOut}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center">
                      {fechaLocal}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.servicioId || "—"}
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
