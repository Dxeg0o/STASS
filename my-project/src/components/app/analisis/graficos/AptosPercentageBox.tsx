import React, { useState, useEffect, useCallback } from "react";

interface DataPoint {
  timestamp: string;
  percentage: number;
}

interface AptosPercentageBoxProps {
  idAnalisis: string;
}

const AptosPercentageBox: React.FC<AptosPercentageBoxProps> = ({
  idAnalisis,
}) => {
  const [latestPercentage, setLatestPercentage] = useState<number | null>(null);

  // Usamos useCallback para memorizar la función y evitar que se recree en cada render
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/analysis/graphics/timeline?id_analisis=${idAnalisis}`
      );
      const data: DataPoint[] = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        setLatestPercentage(latest.percentage);
      } else {
        console.error(
          "La respuesta de la API no contiene datos válidos:",
          data
        );
      }
    } catch (error) {
      console.error("Error al obtener los datos:", error);
    }
  }, [idAnalisis]); // Dependemos de idAnalisis

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]); // Incluimos fetchData en las dependencias

  return (
    <div className="flex items-center justify-center h-24 w-64 bg-blue-100 border border-blue-300 rounded-lg shadow-md">
      {latestPercentage !== null ? (
        <div>
          <h2 className="text-lg font-semibold text-blue-600">
            Porcentaje de Aptos
          </h2>
          <p className="text-3xl font-bold text-blue-800">
            {latestPercentage}%
          </p>
        </div>
      ) : (
        <p className="text-gray-500">Cargando...</p>
      )}
    </div>
  );
};

export default AptosPercentageBox;
