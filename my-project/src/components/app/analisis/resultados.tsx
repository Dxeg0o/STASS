"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface QualityResultsProps {
  selectedLabels: string[];
}

export default function QualityResults({}: QualityResultsProps) {
  const data = [
    { name: "Ene", calidad: 85 },
    { name: "Feb", calidad: 88 },
    { name: "Mar", calidad: 87 },
    { name: "Abr", calidad: 89 },
    { name: "May", calidad: 91 },
    { name: "Jun", calidad: 90 },
  ];

  const rejectionReasons = [
    { reason: "Tamaño", percentage: 40 },
    { reason: "Color", percentage: 30 },
    { reason: "Forma", percentage: 20 },
    { reason: "Textura", percentage: 10 },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-6">
      <h2 className="text-xl font-semibold">Resultados de Calidad</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="calidad" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Resultado General</h3>
          <p className="text-3xl font-bold text-green-600">90%</p>
          <p className="text-sm text-gray-500">de productos aprobados</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Últimos 10 minutos</h3>
          <p className="text-3xl font-bold text-blue-600">92%</p>
          <p className="text-sm text-gray-500">de productos aprobados</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Detalle de Rechazos</h3>
        <ul className="space-y-2">
          {rejectionReasons.map(({ reason, percentage }) => (
            <li key={reason} className="flex justify-between items-center">
              <span>{reason}</span>
              <span className="font-semibold">{percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
