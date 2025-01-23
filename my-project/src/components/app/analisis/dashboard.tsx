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
}

export default function QualityControlDashboard({
  analisis_id,
}: QualityControlDashboardProps) {
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <VideoFeed analisis_id={analisis_id} />
        </div>
        <div>
          <SelectedLabels
            labels={selectedLabels}
            onLabelChange={setSelectedLabels}
          />
        </div>
      </div>
      <div>
        <QualityResults
          selectedLabels={selectedLabels.map((label) => label.name)}
        />
      </div>
      <div className="flex justify-center">
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
