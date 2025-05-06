"use client";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { LoteSelector } from "@/components/app/lotes/loteselector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContext } from "react";

export default function Dashboard() {
  const { data, loading } = useContext(AuthenticationContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">Cargando…</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-red-500">No estás autenticado.</div>
    );
  }

  const empresaId = data.empresaId;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold">Dashboard QualiBlick</h1>

        {/* Sección prominente para el Selector de Lotes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Control de Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <-- Le pasamos la empresaId para que haga GET /api/lotes?empresaId=... */}
            <LoteSelector empresaId={empresaId} />
          </CardContent>
        </Card>

        {/* Contenido del dashboard que depende del lote seleccionado */}
        <Tabs defaultValue="resumen">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Información general y estadísticas del lote seleccionado.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="datos">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Visualización de los datos específicos de este lote.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="graficos">
            <Card>
              <CardHeader>
                <CardTitle>Gráficos del Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Análisis gráfico del lote seleccionado.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
