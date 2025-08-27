// app/dashboard/page.tsx
"use client";

import { useContext, useState, useEffect } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { useServicio } from "@/app/context/ServicioContext";
import { LoteSelector, Lote } from "@/components/app/lotes/loteselector";
import { LoteDataTabs } from "@/components/app/lotes/lotedatatabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const { servicio } = useServicio();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga inicial: 1) lista de lotes 2) lote activo
  useEffect(() => {
    if (!data) return;
    const empresaId = data.empresaId;
    setLoading(true);

    const lotesUrl = `/api/lotes?empresaId=${empresaId}${servicio ? `&servicioId=${servicio.id}` : ""}`;
    const lastUrl = `/api/lotes/activity/last?empresaId=${empresaId}${servicio ? `&servicioId=${servicio.id}` : ""}`;

    Promise.all([fetch(lotesUrl), fetch(lastUrl)])
      .then(async ([lRes, aRes]) => {
        if (!lRes.ok || !aRes.ok) throw new Error("Error al cargar datos");
        const lotesData: Lote[] = await lRes.json();
        const activeLote: Lote | null = await aRes.json();
        setLotes(lotesData);
        setSelectedLote(activeLote);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data, servicio]);

  // Handler para seleccionar / cerrar lote
  const handleSelect = async (lote: Lote | null) => {
    // Si ya hay un lote abierto y se intenta cambiar a otro
    if (selectedLote && lote?.id !== selectedLote.id) {
      const confirmed = confirm(
        `¿Estás seguro de que deseas cambiar del lote "${selectedLote.nombre}" al lote "${lote?.nombre}"?`
      );
      if (!confirmed) return;
    }
    // Si queremos cerrar el lote actual
    if (selectedLote && !lote) {
      const confirmed = confirm(
        `¿Estás seguro de que deseas cerrar el lote "${selectedLote.nombre}"?`
      );
      if (!confirmed) return;
    }

    setSelectedLote(lote);

    if (lote) {
      // Abrir una sesión para ese lote
      await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: lote.id }),
      });
    } else {
      // Cerrar la sesión del lote actual
      await fetch("/api/lotes/activity/close", { method: "POST" });
    }
  };

  // Handler para crear un lote nuevo
  const handleCreate = async (nombre: string) => {
    if (!data || !servicio) return;
    const res = await fetch("/api/lotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        empresaId: data.empresaId,
        servicioId: servicio.id,
      }),
    });
    if (res.ok) {
      const nuevo: Lote = await res.json();
      setLotes((prev) => [nuevo, ...prev]);
      setSelectedLote(nuevo);
      await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: nuevo.id }),
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">Cargando…</div>
    );
  }
  if (!data) {
    return (
      <div className="text-center text-red-500">No estás autenticado.</div>
    );
  }


  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold">Lotes</h1>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Control de Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <LoteSelector
              lotes={lotes}
              selectedLote={selectedLote}
              loading={loading}
              onSelect={handleSelect}
              onSelectNone={() => handleSelect(null)}
              onCreate={handleCreate}
            />
          </CardContent>
        </Card>
        <LoteDataTabs empresaId={data.empresaId} lote={selectedLote} />
      </div>
    </div>
  );
}
