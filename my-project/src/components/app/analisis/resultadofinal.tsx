"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { usePDF } from "react-to-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Download } from "lucide-react";

interface AnalysisResultsProps {
  calidadGeneral: number;
  calidadUltimos10Minutos: number;
  razonesRechazo: { razon: string; porcentaje: number }[];
}

export default function ResultadosAnalisis({
  calidadGeneral,
  calidadUltimos10Minutos,
  razonesRechazo,
}: AnalysisResultsProps) {
  const { toPDF, targetRef } = usePDF({
    filename: "reporte-analisis-calidad.pdf",
  });

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Reporte de Análisis de Calidad
        </h1>
      </div>

      <div ref={targetRef} className="space-y-8">
        <Alert className="border-green-600 bg-green-50">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <AlertTitle className="text-green-800">
            Análisis Completado Exitosamente
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Todos los datos han sido guardados y están listos para exportar.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Puntuación de Calidad General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <Progress value={calidadGeneral} className="h-3" />
                <span className="text-2xl font-bold text-blue-600">
                  {calidadGeneral}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Calidad Últimos 10 Minutos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <Progress value={calidadUltimos10Minutos} className="h-3" />
                <span className="text-2xl font-bold text-green-600">
                  {calidadUltimos10Minutos}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Distribución de Razones de Rechazo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {razonesRechazo.map(({ razon, porcentaje }) => (
                <div key={razon} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{razon}</span>
                    <span className="text-gray-600">{porcentaje}%</span>
                  </div>
                  <Progress value={porcentaje} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <Button
          onClick={() => toPDF()}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-5 h-5" />
          Exportar Reporte Completo
        </Button>
      </div>
    </div>
  );
}
