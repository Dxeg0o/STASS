"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const datos = [
  { nombre: "Cereza", calidad: 85, produccion: 800, precio: 12 },
  { nombre: "Uva", calidad: 88, produccion: 1500, precio: 6 },
  { nombre: "Espárrago", calidad: 92, produccion: 600, precio: 10 },
];

export default function ComparacionProductos() {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="calidad"
            fill="#8884d8"
            name="Calidad (%)"
          />
          <Bar
            yAxisId="left"
            dataKey="produccion"
            fill="#82ca9d"
            name="Producción (kg)"
          />
          <Bar
            yAxisId="right"
            dataKey="precio"
            fill="#ffc658"
            name="Precio ($/kg)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
