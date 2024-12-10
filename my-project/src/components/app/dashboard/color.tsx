"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const data = {
  asparagus: [
    { name: "Verde claro", value: 30 },
    { name: "Verde medio", value: 45 },
    { name: "Verde oscuro", value: 25 },
  ],
  blueberries: [
    { name: "Azul claro", value: 20 },
    { name: "Azul medio", value: 50 },
    { name: "Azul oscuro", value: 30 },
  ],
  grapes: [
    { name: "Verde", value: 35 },
    { name: "Rojo", value: 40 },
    { name: "Morado", value: 25 },
  ],
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

const colorChartConfig = {
  asparagus: {
    "Verde claro": { color: COLORS[0] },
    "Verde medio": { color: COLORS[1] },
    "Verde oscuro": { color: COLORS[2] },
  },
  blueberries: {
    "Azul claro": { color: COLORS[0] },
    "Azul medio": { color: COLORS[1] },
    "Azul oscuro": { color: COLORS[2] },
  },
  grapes: {
    Verde: { color: COLORS[0] },
    Rojo: { color: COLORS[1] },
    Morado: { color: COLORS[2] },
  },
};

export function ColorChart() {
  // En una implementación real, el producto seleccionado vendría de un estado global o prop
  const selectedProduct = "asparagus";

  const productData = data[selectedProduct] || [];
  const productConfig = colorChartConfig[selectedProduct] || {};

  return (
    <ChartContainer config={productConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={productData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {productData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
