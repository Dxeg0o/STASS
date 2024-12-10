"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

type Fruit = {
  name: string
  color: string
  quality: number
  acceptable: boolean
}

const fruits: Fruit[] = [
  { name: "Uvas", color: "#4F2D7F", quality: 85, acceptable: true },
  { name: "Arándanos", color: "#4F86F7", quality: 90, acceptable: true },
  { name: "Cerezas", color: "#B90E0A", quality: 75, acceptable: true },
  { name: "Frutilla", color: "#FF3131", quality: 80, acceptable: true },
  { name: "Manzana", color: "#FF0800", quality: 70, acceptable: false },
  { name: "Naranja", color: "#FFA500", quality: 95, acceptable: true },
  { name: "Limón", color: "#FFF700", quality: 60, acceptable: false },
  { name: "Kiwi", color: "#8EE53F", quality: 88, acceptable: true },
]

export default function FruitQualityChart() {
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Calidad del Color de Frutas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select onValueChange={(value) => setSelectedFruit(fruits.find(fruit => fruit.name === value) || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una fruta" />
          </SelectTrigger>
          <SelectContent>
            {fruits.map((fruit) => (
              <SelectItem key={fruit.name} value={fruit.name}>
                {fruit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedFruit && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: selectedFruit.color }}
              />
              <div className="text-sm font-medium">{selectedFruit.name}</div>
              <div className={`text-sm font-medium ${selectedFruit.acceptable ? 'text-green-500' : 'text-red-500'}`}>
                {selectedFruit.acceptable ? 'Aceptable' : 'No aceptable'}
              </div>
            </div>
            <ChartContainer
              config={{
                quality: {
                  label: "Calidad del Color",
                  color: selectedFruit.color,
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[selectedFruit]} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quality" fill={selectedFruit.color} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="text-sm text-center">
              Calidad del color: {selectedFruit.quality}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

