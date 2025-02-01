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
import { Loader2 } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface TimelineProps {
  idAnalisis: string;
  onError?: (message: string) => void;
}

export default function Timeline({ idAnalisis, onError }: TimelineProps) {
  const [dataPoints, setDataPoints] = useState<
    { timestamp: string; percentage: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/analysis/graphics/timeline?id_analisis=${idAnalisis}`
        );

        if (!response.ok) throw new Error("Error fetching data");

        const data = await response.json();

        if (Array.isArray(data)) {
          const newPoints = data.map((item) => ({
            timestamp: new Date(item.timestamp).toLocaleTimeString(),
            percentage: item.percentage,
          }));
          setDataPoints((prev) => [...prev, ...newPoints].slice(-60));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [idAnalisis, onError]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Line
      data={{
        labels: dataPoints.map((p) => p.timestamp),
        datasets: [
          {
            label: "Porcentaje de Aptos",
            data: dataPoints.map((p) => p.percentage),
            borderColor: "hsl(142.1 76.2% 36.3%)",
            borderWidth: 2,
            tension: 0.1,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            title: { display: true, text: "Tiempo" },
          },
          y: {
            min: 0,
            max: 100,
            title: { display: true, text: "Porcentaje Aptos (%)" },
          },
        },
      }}
    />
  );
}
