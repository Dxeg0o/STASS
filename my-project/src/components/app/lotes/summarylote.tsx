// components/app/lotes/SummaryLote.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ResumenLote, Summary } from "./resumenlote";

interface SummaryLoteProps {
  loteId: string;
  /** (Opcional) Si deseas exponer desde el componente padre un callback
   *  para “refrescar” externamente, puedes pasarlo por props,
   *  por ejemplo onRefresh: () => void. Aquí asumimos que el botón
   *  “Refrescar Resumen” vive en un contenedor superior. */
}

export function SummaryLote({ loteId }: SummaryLoteProps) {
  const [summary, setSummary] = useState<Summary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loteId) {
      setSummary(null);
      setError(null);
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
        const normalized = data.map((d) => ({
          ...d,
          lastTimestamp: d.lastTimestamp ?? "",
        }));
        setSummary(normalized);
      })
      .catch((err) => {
        setError(err.message);
        setSummary(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loteId]);

  return <ResumenLote summary={summary} loading={loading} error={error} />;
}
