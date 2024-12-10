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
  DotProps,
} from "recharts";

interface QualityResultsProps {
  selectedLabels: string[];
}

export default function QualityResults({}: QualityResultsProps) {
  const data = [
    { name: "Min 5", calidad: 82 },
    { name: "Min 10", calidad: 78 },
    { name: "Min 15", calidad: 85 },
    { name: "Min 20", calidad: 89 },
    { name: "Min 25", calidad: 91 },
    { name: "Min 30", calidad: 95 }, // Ejemplo de valor bajo para pruebas
  ];

  const rejectionReasons = [
    { reason: "Tamaño", percentage: 40 },
    { reason: "Color", percentage: 30 },
    { reason: "Forma", percentage: 20 },
    { reason: "Textura", percentage: 10 },
  ];

  // Componente para renderizar puntos personalizados
  const CustomizedDot = (props: DotProps & { value: number }) => {
    const { cx, cy, value } = props;
    if (value < 80 && cx !== undefined && cy !== undefined) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={10} // Aumentar aún más el tamaño del círculo
            stroke="red"
            strokeWidth={4} // Aumentar el grosor del borde
            fill="yellow" // Cambiar el color de relleno para mayor contraste
          />
          <text
            x={cx}
            y={cy - 20} // Posicionar el texto más arriba del círculo
            textAnchor="middle"
            fill="red"
            fontSize="20px" // Aumentar el tamaño del símbolo
            fontWeight="bold"
          >
            ⚠️
          </text>
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill="#8884d8" />;
  };

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
            <Line
              type="monotone"
              dataKey="calidad"
              stroke="#8884d8"
              dot={<CustomizedDot value={0} />}
            />
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
