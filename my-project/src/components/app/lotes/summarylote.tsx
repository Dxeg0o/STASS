// components/app/lotes/SummaryLote.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Summary {
  countIn: number;
  countOut: number;
  lastTimestamp: string | null;
  dispositivo: string;
  servicioId: string;
}

interface SummaryLoteProps {
  loteId: string;
}

export function SummaryLote({ loteId }: SummaryLoteProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loteId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    fetch(`/api/lotes/summary?loteId=${loteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar el resumen");
        return res.json();
      })
      .then((data: Summary) => setSummary(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loteId]);

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
  if (!summary) {
    return null;
  }

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
          <p className="text-3xl font-bold">{summary.countIn}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salidas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.countOut}</p>
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
