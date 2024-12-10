'use client'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QualityChart } from '@/components/app/dashboard/calidad-grafico'
import { ColorChart } from '@/components/app/dashboard/color'
import { ProductSelector } from '@/components/app/dashboard/selector-productos'
import { UserGreeting } from '@/components/app/dashboard/gracias'
import { QualityIndicator } from '@/components/app/dashboard/indicador-calidad'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserGreeting />
      <h1 className="text-4xl font-bold mb-8">Control inteligente de calidad que impulsa tus exportaciones</h1>
      <p className="text-xl mb-8">
        Ayudamos a las pymes exportadoras a controlar la calidad de sus productos, reduciendo hasta un 30% los costos de inspección manual. Todo esto con tecnología de punta, sin necesidad de grandes inversiones.
      </p>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Calidad de Exportaciones</CardTitle>
          <CardDescription>Seleccione un producto y un rango de fechas para ver los datos históricos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <ProductSelector />
            <DatePickerWithRange />
          </div>
          <Suspense fallback={<div>Cargando gráfico de calidad...</div>}>
            <QualityChart />
          </Suspense>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Análisis de Color</CardTitle>
          <CardDescription>Distribución de color para el producto seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando gráfico de color...</div>}>
            <ColorChart />
          </Suspense>
        </CardContent>
      </Card>
      <QualityIndicator className="mb-8" />
    </div>
  )
}

