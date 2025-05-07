// components/app/lotes/ResumenLote.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface Summary {
  countIn: number;
  countOut: number;
  lastTimestamp: string | null;
  dispositivo: string;
  servicioId: string;
}

interface ResumenLoteProps {
  summary: Summary | null;
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
  if (!summary) {
    return (
      <p className="text-center text-gray-500">
        Selecciona primero un lote para ver el resumen.
      </p>
    );
  }

  // 3) Render principal
  const fechaLocal = summary.lastTimestamp
    ? new Date(summary.lastTimestamp).toLocaleString("es-CL", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {summary.countIn + summary.countOut}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Último Conteo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{fechaLocal}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{summary.dispositivo || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{summary.servicioId || "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
