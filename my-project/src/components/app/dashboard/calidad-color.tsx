"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Fruit = {
  name: string;
  color: string;
  quality: number;
  acceptable: boolean;
};

const fruits: Fruit[] = [
  { name: "Uvas", color: "#9370DB", quality: 85, acceptable: true },
  { name: "Esparragos", color: "#90EE90", quality: 90, acceptable: true },
  { name: "Cerezas", color: "#FF7F7F", quality: 75, acceptable: true },
];

export default function FruitQualityChart() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={fruits}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis type="number" domain={[0, 100]} />
        <YAxis dataKey="name" type="category" width={80} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const fruit = payload[0].payload as Fruit;
              return (
                <Card>
                  <CardContent className="p-2">
                    <p className="font-bold">{fruit.name}</p>
                    <p>Calidad: {fruit.quality}%</p>
                    <p
                      className={
                        fruit.acceptable ? "text-green-500" : "text-red-500"
                      }
                    >
                      {fruit.acceptable ? "Aceptable" : "No aceptable"}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="quality">
          {fruits.map((fruit, index) => (
            <Cell key={`cell-${index}`} fill={fruit.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
