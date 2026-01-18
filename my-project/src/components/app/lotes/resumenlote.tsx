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
    <Card className="w-full bg-slate-900/40 border border-white/10 shadow-lg rounded-xl overflow-hidden backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Resumen por Dispositivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3.1) Mostrar total de bulbos en todo el lote */}
        <div>
          <p className="text-xl font-bold text-slate-200">
            Total Bulbos Lote:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 animate-pulse">{totalBulbos}</span>
          </p>
        </div>

        {/* 3.2) Tabla con detalle por dispositivo */}
        <div className="w-full overflow-x-auto rounded-lg border border-white/5">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-slate-950/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Último Conteo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Servicio
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/5">
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

                const ingresos = item.countIn + item.countOut;

                return (
                  <tr key={item.dispositivo} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {item.dispositivo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 text-right font-medium">
                      {ingresos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center">
                      {fechaLocal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
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
