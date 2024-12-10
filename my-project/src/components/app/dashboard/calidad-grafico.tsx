"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { date: '2023-01', length: 20, width: 2.5, color: 90 },
  { date: '2023-02', length: 22, width: 2.7, color: 85 },
  { date: '2023-03', length: 19, width: 2.4, color: 92 },
  { date: '2023-04', length: 21, width: 2.6, color: 88 },
  { date: '2023-05', length: 23, width: 2.8, color: 87 },
  { date: '2023-06', length: 20, width: 2.5, color: 91 },
]

export function QualityChart() {
  return (
    <ChartContainer
      config={{
        length: {
          label: "Longitud (cm)",
          color: "hsl(var(--chart-1))",
        },
        width: {
          label: "Ancho (cm)",
          color: "hsl(var(--chart-2))",
        },
        color: {
          label: "Color (0-100)",
          color: "hsl(var(--chart-3))",
        },
      }}
      className="h-[400px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="length" stroke="var(--color-length)" name="Longitud" />
          <Line yAxisId="left" type="monotone" dataKey="width" stroke="var(--color-width)" name="Ancho" />
          <Line yAxisId="right" type="monotone" dataKey="color" stroke="var(--color-color)" name="Color" />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

