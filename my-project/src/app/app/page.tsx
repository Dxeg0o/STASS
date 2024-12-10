"use client";

import { useState } from "react";
import FruitQualityChart from "@/components/app/dashboard/calidad-color";
import GraficoProductos from "@/components/app/dashboard/grafico-productos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import ComparacionProductos from "@/components/app/dashboard/comparación-productos";
export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Historial de Productos
          </h2>
          <div className="flex items-center space-x-8">
            {" "}
            {/* Aumentar significativamente el espacio en el eje x */}
            <DatePickerWithRange />
            <Button onClick={handleRefresh}>
              {isRefreshing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar datos
            </Button>
          </div>
        </div>
        <div className="grid gap-12 md:grid-cols-3">
          {" "}
          {/* Aumentar significativamente el espacio entre columnas */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Calidad del Color de Frutas</CardTitle>
            </CardHeader>
            <CardContent>
              <FruitQualityChart />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Porcentaje de Productos Aprobados</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoProductos />
            </CardContent>
          </Card>
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Comparación de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparacionProductos />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
