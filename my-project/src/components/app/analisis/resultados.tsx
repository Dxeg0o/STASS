"use client";

import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

//ver si Modificar el backend: Devolver solo las predicciones nuevas desde la última consulta.
//Esto puede lograrse utilizando un filtro basado en tiempo (createdAt) o un identificador incremental.

export default function QualityResults({
  id_analisis,
}: {
  id_analisis: string;
}) {
  const [dataPoints, setDataPoints] = useState<
    { timestamp: string; percentage: number }[]
  >([]);
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: "Porcentaje de Aptos",
        data: [] as number[],
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
      },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/analysis/graphics/timeline?id_analisis=${id_analisis}`
        );
        const data = await response.json();

        if (Array.isArray(data)) {
          const newPoints = data.map(
            (item: { timestamp: string; percentage: number }) => ({
              timestamp: new Date(item.timestamp).toLocaleTimeString(),
              percentage: item.percentage,
            })
          );
          setDataPoints((prev) => [...prev, ...newPoints].slice(-50));
        } else {
          console.error("Respuesta de la API no es un array:", data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [id_analisis]);

  useEffect(() => {
    setChartData({
      labels: dataPoints.map((point) => point.timestamp),
      datasets: [
        {
          label: "Porcentaje de Aptos",
          data: dataPoints.map((point) => point.percentage),
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
        },
      ],
    });
  }, [dataPoints]);

  return (
    <div className="min-w-screen">
      <div className="px-12">
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Tiempo",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Porcentaje",
                },
                min: 0,
                max: 100,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
