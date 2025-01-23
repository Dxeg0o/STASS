"use client";

import { useState } from "react";
import VideoFeed from "./video";
import SelectedLabels from "./etiquetas-seleccionadas";
import QualityResults from "./resultados";
import AnalysisResults from "./resultadofinal";
import { Button } from "@/components/ui/button";

interface Label {
  name: string;
  subLabels?: string[];
}
interface QualityControlDashboardProps {
  analisis_id: string;
  params: {
    minLength: number | undefined;
    maxLength: number | undefined;
    minWidth: number | undefined;
    maxWidth: number | undefined;
  };
}

export default function QualityControlDashboard({
  analisis_id,
  params,
}: QualityControlDashboardProps) {
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Validación de parámetros predeterminados para evitar valores "undefined"
  const validatedParams = {
    minLength: params.minLength ?? 0,
    maxLength: params.maxLength ?? Infinity,
    minWidth: params.minWidth ?? 0,
    maxWidth: params.maxWidth ?? Infinity,
  };

  const handleFinishAnalysis = () => {
    setAnalysisComplete(true);
  };

  const rejectionReasons = [
    { reason: "Tamaño", percentage: 40 },
    { reason: "Color", percentage: 30 },
    { reason: "Forma", percentage: 20 },
    { reason: "Textura", percentage: 10 },
  ];

  if (analysisComplete) {
    return (
      <AnalysisResults
        overallQuality={90}
        last10MinutesQuality={92}
        rejectionReasons={rejectionReasons}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-8">
      {/* Mensaje de validación si los parámetros son inválidos */}
      {params.minWidth === undefined ||
      params.maxWidth === undefined ||
      params.minLength === undefined ||
      params.maxLength === undefined ? (
        <div className="text-red-600 text-center">
          <p>
            ⚠️ Algunos parámetros no están definidos. Por favor verifica antes
            de continuar.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {/* Pasamos los parámetros validados a VideoFeed */}
          <VideoFeed analisis_id={analisis_id} params={validatedParams} />
        </div>
        <div>
          {/* Gestión de etiquetas seleccionadas */}
          <SelectedLabels
            labels={selectedLabels}
            onLabelChange={setSelectedLabels}
          />
        </div>
      </div>
      <div>
        {/* Pasamos nombres de etiquetas seleccionadas */}
        <QualityResults
          selectedLabels={selectedLabels.map((label) => label.name)}
        />
      </div>
      <div className="flex justify-center">
        {/* Botón para finalizar análisis */}
        <Button
          onClick={handleFinishAnalysis}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Terminar análisis
        </Button>
      </div>
    </div>
  );
}
