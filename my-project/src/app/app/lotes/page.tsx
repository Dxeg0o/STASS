"use client";

import { useContext, useState, useEffect } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { LoteSelector, Lote } from "@/components/app/lotes/loteselector";
import { SummaryLote } from "@/components/app/lotes/summarylote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga inicial de lotes y lote activo
  useEffect(() => {
    if (!data) return;
    const empresaId = data.empresaId;
    setLoading(true);

    Promise.all([
      fetch(`/api/lotes?empresaId=${empresaId}`),
      fetch(`/api/lotes/activity/last?empresaId=${empresaId}`),
    ])
      .then(async ([lRes, aRes]) => {
        if (!lRes.ok || !aRes.ok) throw new Error("Error al cargar datos");
        const lotesData: Lote[] = await lRes.json();
        const active: Lote | null = await aRes.json();
        setLotes(lotesData);
        setSelectedLote(active);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data]);

  // Handler con confirmación
  const handleSelect = async (lote: Lote | null) => {
    // Confirmar si ya hay un lote seleccionado y se intenta cambiar
    if (selectedLote && lote?.id !== selectedLote.id) {
      const confirmed = confirm(
        `¿Estás seguro de que deseas cambiar del lote "${selectedLote.nombre}" al lote "${lote?.nombre}"?`
      );
      if (!confirmed) return;
    }

    // Confirmar si se quiere cerrar el lote actual
    if (selectedLote && !lote) {
      const confirmed = confirm(
        `¿Estás seguro de que deseas cerrar el lote "${selectedLote.nombre}"?`
      );
      if (!confirmed) return;
    }

    setSelectedLote(lote);

    if (lote) {
      await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: lote.id }),
      });
    } else {
      await fetch("/api/lotes/activity/close", { method: "POST" });
    }
  };

  const handleCreate = async (nombre: string) => {
    if (!data) return;
    const res = await fetch("/api/lotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, empresaId: data.empresaId }),
    });
    if (res.ok) {
      const nuevo: Lote = await res.json();
      setLotes((prev) => [nuevo, ...prev]);
      setSelectedLote(nuevo);
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

  const loteId = selectedLote?.id ?? "";

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

        <Tabs defaultValue="resumen">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <SummaryLote loteId={loteId} />
          </TabsContent>

          <TabsContent value="datos">
            {/* ... contenido de datos ... */}
          </TabsContent>

          <TabsContent value="graficos">
            <Card>
              <CardHeader>
                <CardTitle>Gráficos del Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Aquí se generarán los gráficos de conteos del lote.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
