// components/app/lotes/SummaryLote.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ResumenLote, type Summary } from "./resumenlote";

interface SummaryLoteProps {
  loteId: string;
  /** (Opcional) Si deseas exponer desde el componente padre un callback
   *  para “refrescar” externamente, puedes pasarlo por props,
   *  por ejemplo onRefresh: () => void. Aquí asumimos que el botón
   *  “Refrescar Resumen” vive en un contenedor superior. */
}

export function SummaryLote({ loteId }: SummaryLoteProps) {
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
  }, [loteId]);

  if (!loteId) {
    return (
      <p className="text-center text-gray-500">
        Selecciona primero un lote para ver el resumen.
      </p>
    );
  }

  return (
    <ResumenLote summary={summaries} loading={loading} error={error} />
  );
}
