'use client'
import FruitQualityChart from "@/components/app/dashboard/calidad-color";
import GraficoProductos from "@/components/app/dashboard/grafico-productos";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Análisis de Productos</h1>
      
      {/* Contenedor de gráficos en fila */}
      <div className="flex flex-row space-x-8">
        <FruitQualityChart />
        <GraficoProductos />
      </div>

    </main>
  )
}
