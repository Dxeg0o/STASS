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
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CalidadEsparragosAprobado() {
  const data = [
    { name: "Aprobados", value: 90, color: "hsl(142, 76%, 36%)" },
    { name: "Fallos por largo", value: 6, color: "hsl(0, 84%, 60%)" },
    { name: "Fallos por calibre", value: 4, color: "hsl(45, 93%, 47%)" },
  ];

  const totalEsparragos = 1000; // Asumimos un total de 1000 espárragos para este ejemplo

  return (
    <Card className="w-full max-w-4xl mx-auto my-2">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center mb-4">
          Control de Calidad de Espárragos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-green-600 text-white">
          <CheckCircle className="h-6 w-6" />
          <AlertTitle className="text-2xl font-bold">LOTE APROBADO</AlertTitle>
          <AlertDescription className="text-lg">
            El 90% de los espárragos cumplen con los estándares de calidad.
            Superando el mínimo requerido del 80%.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Distribución de Calidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="value" name="Porcentaje">
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Detalles de Calidad</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {Math.round((item.value * totalEsparragos) / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.value}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-center mb-2 text-green-600">
              Excelente rendimiento de calidad
            </p>
            <p className="text-lg text-green-800 text-center">
              El lote ha superado los estándares de calidad. Mantener las
              prácticas actuales y considerar optimizaciones para reducir aún
              más los fallos por largo (6%) y calibre (4%).
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
