"use client";

import { useState, useEffect } from "react";
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
  const fullData = [
    { name: "Min 5", calidad: 82 },
    { name: "Min 10", calidad: 78 },
    { name: "Min 15", calidad: 85 },
    { name: "Min 20", calidad: 89 },
    { name: "Min 25", calidad: 91 },
    { name: "Min 30", calidad: 95 },
  ];

  const initialRejectionReasons = [
    { reason: "Tamaño", percentage: 40 },
    { reason: "Color", percentage: 30 },
    { reason: "Forma", percentage: 20 },
    { reason: "Textura", percentage: 10 },
  ];

  const [visibleData, setVisibleData] = useState<
    { name: string; calidad: number }[]
  >([]);
  const [generalResult, setGeneralResult] = useState(0);
  const [last5MinutesResult, setLast5MinutesResult] = useState(0);
  const [rejectionReasons, setRejectionReasons] = useState(
    initialRejectionReasons
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleData((prevData) => {
        const nextIndex = prevData.length;
        if (nextIndex < fullData.length) {
          const newVisibleData = [...prevData, fullData[nextIndex]];

          // Update general result
          const totalQuality = newVisibleData.reduce(
            (acc, item) => acc + item.calidad,
            0
          );
          setGeneralResult(Math.round(totalQuality / newVisibleData.length));

          // Update last 5 minutes result
          const last5Data = newVisibleData.slice(-1);
          setLast5MinutesResult(last5Data[0]?.calidad || 0);

          return newVisibleData;
        } else {
          clearInterval(interval);
          return prevData;
        }
      });

      // Update rejection reasons
      setRejectionReasons((prevReasons) => {
        const updatedReasons = prevReasons.map((reason) => ({
          ...reason,
          percentage: Math.max(
            5,
            Math.min(50, reason.percentage + (Math.random() > 0.5 ? 1 : -1))
          ),
        }));
        const total = updatedReasons.reduce(
          (acc, curr) => acc + curr.percentage,
          0
        );
        return updatedReasons.map((reason) => ({
          ...reason,
          percentage: Math.round((reason.percentage / total) * 100),
        }));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisibleData([fullData[0]]);
      setGeneralResult(fullData[0].calidad);
      setLast5MinutesResult(fullData[0].calidad);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const CustomizedDot = (props: DotProps & { value: number }) => {
    const { cx, cy, value } = props;
    if (value < 80 && cx !== undefined && cy !== undefined) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={10}
            stroke="red"
            strokeWidth={4}
            fill="yellow"
          />
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            fill="red"
            fontSize="20px"
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
      <div className="flex items-center space-x-2">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute"></div>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
        <span className="text-red-500 font-semibold">En Vivo</span>
      </div>

      <h2 className="text-xl font-semibold">Resultados de Calidad</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" padding={{ left: 30, right: 30 }} />
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
          <p className="text-3xl font-bold text-green-600">{generalResult}%</p>
          <p className="text-sm text-gray-500">de productos aprobados</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Últimos 5 minutos</h3>
          <p className="text-3xl font-bold text-blue-600">
            {last5MinutesResult}%
          </p>
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
