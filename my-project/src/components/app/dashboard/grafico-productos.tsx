'use client'

import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const datos: Record<'arandano' | 'cereza' | 'uva' | 'esparrago', { fecha: string; largo: number; ancho: number }[]> = {
  arandano: [
    { fecha: '2023-01', largo: 80, ancho: 75 },
    { fecha: '2023-02', largo: 85, ancho: 80 },
    { fecha: '2023-03', largo: 90, ancho: 85 },
    { fecha: '2023-04', largo: 88, ancho: 82 },
    { fecha: '2023-05', largo: 92, ancho: 88 },
  ],
  cereza: [
    { fecha: '2023-01', largo: 70, ancho: 65 },
    { fecha: '2023-02', largo: 75, ancho: 70 },
    { fecha: '2023-03', largo: 80, ancho: 75 },
    { fecha: '2023-04', largo: 78, ancho: 72 },
    { fecha: '2023-05', largo: 82, ancho: 78 },
  ],
  uva: [
    { fecha: '2023-01', largo: 85, ancho: 80 },
    { fecha: '2023-02', largo: 88, ancho: 85 },
    { fecha: '2023-03', largo: 92, ancho: 90 },
    { fecha: '2023-04', largo: 90, ancho: 88 },
    { fecha: '2023-05', largo: 95, ancho: 92 },
  ],
  esparrago: [
    { fecha: '2023-01', largo: 75, ancho: 70 },
    { fecha: '2023-02', largo: 80, ancho: 75 },
    { fecha: '2023-03', largo: 85, ancho: 80 },
    { fecha: '2023-04', largo: 82, ancho: 78 },
    { fecha: '2023-05', largo: 88, ancho: 85 },
  ],
}

export default function GraficoProductos() {
  const [productoSeleccionado, setProductoSeleccionado] = useState<keyof typeof datos>('arandano')
  const [dimensionSeleccionada, setDimensionSeleccionada] = useState<'largo' | 'ancho'>('largo')

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Porcentaje de Productos Aprobados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <Select
            onValueChange={(value) => setProductoSeleccionado(value as keyof typeof datos)}
            defaultValue={productoSeleccionado}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona un producto" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(datos).map((producto) => (
                <SelectItem key={producto} value={producto}>
                  {producto.charAt(0).toUpperCase() + producto.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => setDimensionSeleccionada(value as 'largo' | 'ancho')}
            defaultValue={dimensionSeleccionada}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona una dimensión" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="largo">Largo</SelectItem>
              <SelectItem value="ancho">Ancho</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={datos[productoSeleccionado]}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={dimensionSeleccionada} stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
