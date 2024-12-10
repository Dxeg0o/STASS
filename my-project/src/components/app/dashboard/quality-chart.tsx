"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const data = {
  asparagus: [
    { date: "2023-01", length: 20, width: 2.5 },
    { date: "2023-02", length: 22, width: 2.7 },
    { date: "2023-03", length: 19, width: 2.4 },
    { date: "2023-04", length: 21, width: 2.6 },
    { date: "2023-05", length: 23, width: 2.8 },
    { date: "2023-06", length: 20, width: 2.5 },
  ],
  blueberries: [
    { date: "2023-01", size: 1.2, firmness: 85 },
    { date: "2023-02", size: 1.3, firmness: 82 },
    { date: "2023-03", size: 1.1, firmness: 88 },
    { date: "2023-04", size: 1.2, firmness: 86 },
    { date: "2023-05", size: 1.4, firmness: 84 },
    { date: "2023-06", size: 1.3, firmness: 87 },
  ],
  grapes: [
    { date: "2023-01", size: 2.0, sugarContent: 16 },
    { date: "2023-02", size: 2.2, sugarContent: 17 },
    { date: "2023-03", size: 1.9, sugarContent: 15 },
    { date: "2023-04", size: 2.1, sugarContent: 16 },
    { date: "2023-05", size: 2.3, sugarContent: 18 },
    { date: "2023-06", size: 2.2, sugarContent: 17 },
  ],
};

const chartConfig: Record<
  string,
  Record<string, { label: string; color: string }>
> = {
  asparagus: {
    length: { label: "Longitud (cm)", color: "hsl(var(--chart-1))" },
    width: { label: "Ancho (cm)", color: "hsl(var(--chart-2))" },
  },
  blueberries: {
    size: { label: "Tamaño (cm)", color: "hsl(var(--chart-1))" },
    firmness: { label: "Firmeza (0-100)", color: "hsl(var(--chart-2))" },
  },
  grapes: {
    size: { label: "Tamaño (cm)", color: "hsl(var(--chart-1))" },
    sugarContent: {
      label: "Contenido de azúcar (Brix)",
      color: "hsl(var(--chart-2))",
    },
  },
};

export function QualityChart() {
  // En una implementación real, el producto seleccionado vendría de un estado global o prop
  const selectedProduct = "asparagus";

  const productData = data[selectedProduct] || [];
  const productConfig = chartConfig[selectedProduct] || {};

  return (
    <ChartContainer config={productConfig} className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={productData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {Object.keys(productConfig).map((key, index) => (
            <Line
              key={key}
              yAxisId={index === 0 ? "left" : "right"}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              name={productConfig[key].label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
