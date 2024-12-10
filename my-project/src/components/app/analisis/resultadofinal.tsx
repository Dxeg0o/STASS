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
          Resultados del Análisis de Calidad
        </h2>

        <div className="grid grid-cols-1 mb-6">
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Calidad General</h3>
            <p className="text-4xl font-bold text-green-600">
              {overallQuality}%
            </p>
            <p className="text-sm text-gray-600">de productos aprobados</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Detalle de Rechazos</h3>
          <ul className="space-y-2">
            {rejectionReasons.map(({ reason, percentage }) => (
              <li
                key={reason}
                className="flex justify-between items-center border-b pb-2"
              >
                <span>{reason}</span>
                <span className="font-semibold">{percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => toPDF()}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Descargar Resultados (PDF)
        </Button>
      </div>
    </div>
  );
}
