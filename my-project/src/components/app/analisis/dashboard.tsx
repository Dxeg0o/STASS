"use client";

import { useState } from "react";
import VideoFeed from "./video";
import SelectedLabels from "./etiquetas-seleccionadas";
import AnalysisResults from "./resultadofinal";
import { Button } from "@/components/ui/button";
import Timeline from "./graficos/timeline";
import AptosPercentageBox from "./graficos/AptosPercentageBox";
import LastAptosPercentageBox from "./graficos/LastAptosPercentageBox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Label {
  name: string;
  subLabels?: string[];
}

interface QualityControlDashboardProps {
  analisisId: string;
  params: {
    minLength: number;
    maxLength: number;
    minWidth: number;
    maxWidth: number;
  };
  onBack: () => void;
}

export default function QualityControlDashboard({
  analisisId,
  params,
  onBack,
}: QualityControlDashboardProps) {
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinishAnalysis = () => {
    setShowConfirmDialog(true);
  };

  const confirmFinishAnalysis = () => {
    setAnalysisComplete(true);
    setShowConfirmDialog(false);
  };

  const rejectionReasons = [
    { razon: "Tamaño", porcentaje: 40 },
    { razon: "Color", porcentaje: 30 },
    { razon: "Forma", porcentaje: 20 },
    { razon: "Textura", porcentaje: 10 },
  ];

  if (analysisComplete) {
    return (
      <AnalysisResults
        calidadGeneral={90}
        calidadUltimos10Minutos={92}
        razonesRechazo={rejectionReasons}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-8 p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de Control de Calidad</h1>
        <Button variant="outline" onClick={onBack}>
          Volver a configuración
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error en el sistema</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Video en tiempo real
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Vista previa del flujo de producción con análisis en tiempo
                    real
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VideoFeed
              analisisId={analisisId}
              params={params}
              onError={(message) => setError(message)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Etiquetas de Control
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Seleccione las características de calidad a monitorear</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SelectedLabels
              labels={selectedLabels}
              onLabelChange={setSelectedLabels}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métricas de Calidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Evolución temporal
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Porcentaje de productos aptos durante las últimas 2 horas
                    </p>
                  </TooltipContent>
                </Tooltip>
              </h3>
              <div className="h-64 my-4">
                <Timeline idAnalisis={analisisId} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AptosPercentageBox idAnalisis={analisisId} onError={setError} />
              <LastAptosPercentageBox
                idAnalisis={analisisId}
                onError={setError}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button
          onClick={handleFinishAnalysis}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
        >
          Finalizar Análisis
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Finalización</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea finalizar el análisis? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmFinishAnalysis}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
