// app/dashboard/page.tsx

"use client";
import React, { useContext, useState, useEffect } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Lote } from "@/components/app/lotes/loteselector";
import { ResumenLoteSelector } from "@/components/app/lotes/resumenloteselector";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoteTabs } from "@/components/app/lotes/lotetabs";
// Define aquí la forma de cada registro de conteo
interface ConteoRecord {
  _id: string;
  timestamp: string;
  count_in: number;
  count_out: number;
  dispositivo: string;
  // puedes añadir más campos si tu API los devuelve
}

export default function Dashboard() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  // Estados para lotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);


  // Datos totales de la empresa
  const [totalRecords, setTotalRecords] = useState<ConteoRecord[]>([]);
  const [loadingTotal, setLoadingTotal] = useState(false);
  const [errorTotal, setErrorTotal] = useState<string | null>(null);

  // ============== Funciones de carga (fetch) ==============

  // 1) Carga lotes al montar o cuando cambia `data`
  useEffect(() => {
    if (!data) return;
    setLoadingLotes(true);
    fetch(`/api/lotes?empresaId=${data.empresaId}`)
      .then((res) => res.json())
      .then((arr: Lote[]) => setLotes(arr))
      .catch((err) => console.error(err))
      .finally(() => setLoadingLotes(false));
  }, [data]);

  // 2) Carga datos totales de la empresa
  useEffect(() => {
    if (!data) return;
    setLoadingTotal(true);
    fetch(`/api/conteos?empresaId=${data.empresaId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar datos totales");
        return res.json();
      })
      .then((arr: ConteoRecord[]) => setTotalRecords(arr))
      .catch((err) => setErrorTotal(err.message))
      .finally(() => setLoadingTotal(false));
  }, [data]);


  // ============== Renderizado ==============
  if (authLoading) return <div>Cargando…</div>;
  if (!data) return <div>No estás autenticado.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Hola {data.name}!</h1>

      {/* Pestañas principales: Totales y Por Lote */}
      <Tabs defaultValue="datosTotales">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="datosTotales">Datos Totales</TabsTrigger>
          <TabsTrigger value="datosPorLote">Datos por Lote</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------ */}
        {/* DATOS TOTALES */}
        <TabsContent value="datosTotales">
          {loadingTotal ? (
            <p>Cargando datos totales…</p>
          ) : errorTotal ? (
            <p className="text-red-600">{errorTotal}</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Datos Totales</CardTitle>
              </CardHeader>
              <CardContent>
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
                      {totalRecords.map((rec) => (
                        <tr key={rec._id}>
                          <td className="px-4 py-2">
                            {new Date(rec.timestamp).toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-2">
                            {rec.count_in + rec.count_out}
                          </td>
                          <td className="px-4 py-2">{rec.dispositivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------------------------------ */}
        {/* DATOS POR LOTE */}
        <TabsContent value="datosPorLote">
          {/* Selector de lote */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Datos de Conteo por Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumenLoteSelector
                lotes={lotes}
                selectedLote={selectedLote}
                loading={loadingLotes}
                onSelect={(l) => setSelectedLote(l)}
                onSelectNone={() => setSelectedLote(null)}
              />
            </CardContent>
          </Card>

          <LoteTabs loteId={selectedLote?.id ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
