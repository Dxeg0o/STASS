"use client";

import { useContext, useState } from "react";
import FruitQualityChart from "@/components/app/dashboard/calidad-color";
import GraficoProductos from "@/components/app/dashboard/grafico-productos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import ComparacionProductos from "@/components/app/dashboard/comparación-productos";
import { AuthenticationContext } from "@/app/context/AuthContext";
export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data } = useContext(AuthenticationContext);
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => setIsRefreshing(false), 1500);
  };
  console.log(data?.name);
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
        <div className="flex justify-between gap-16">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-2xl">
                Calidad del Color de Frutas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FruitQualityChart />
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-2xl">
                Porcentaje de Productos Aprobados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoProductos />
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-center mt-24">
          <Card className="w-full max-w-[98%]">
            <CardHeader>
              <CardTitle className="text-3xl">
                Comparación de Productos
              </CardTitle>
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
