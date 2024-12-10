"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { usePDF } from "react-to-pdf";

interface AnalysisResultsProps {
  overallQuality: number;
  last10MinutesQuality: number;
  rejectionReasons: { reason: string; percentage: number }[];
}

export default function AnalysisResults({
  overallQuality,
  rejectionReasons,
}: AnalysisResultsProps) {
  const { toPDF, targetRef } = usePDF({ filename: "analisis-calidad.pdf" });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl flex justify-center flex-col items-center">
      <div ref={targetRef}>
        <h2 className="text-2xl font-bold mb-6 text-center">
          Análisis Terminado
        </h2>
        <p className="text-lg text-center mb-6">Datos guardados ✅</p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => toPDF()}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Descargar Datos de este Análisis
        </Button>
      </div>
    </div>
  );
}
