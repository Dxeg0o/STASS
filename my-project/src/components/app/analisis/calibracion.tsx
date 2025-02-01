"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Info,
  CheckCircle,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface CalibracionProps {
  onNext: () => void;
  onBack: () => void; // Add this line
}

export default function Calibracion({ onNext }: CalibracionProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [distancePx, setDistancePx] = useState<number | null>(null);
  const [realWidth, setRealWidth] = useState<number | null>(null);
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, title: "Capturar Referencia" },
    { id: 2, title: "Medir Distancia" },
    { id: 3, title: "Calibrar" },
  ];

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
      const videoDevices = deviceList.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    });
  }, []);

  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImagePreview(imageSrc);
        setPoints([]);
        setDistancePx(null);
        setPxPerCm(null);
        setCurrentStep(2);
      }
    }
  };

  const handleImageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!imagePreview || currentStep !== 2) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setPoints((prevPoints) => {
      const newPoints = [...prevPoints, { x, y }];
      if (newPoints.length === 2) {
        const dx = newPoints[1].x - newPoints[0].x;
        const dy = newPoints[1].y - newPoints[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        setDistancePx(distance);
        setCurrentStep(3);
      }
      return newPoints.length > 2 ? [{ x, y }] : newPoints;
    });
  };

  const handleCalibration = () => {
    if (!distancePx || !realWidth || realWidth <= 0) {
      setError("Por favor seleccione dos puntos e ingrese una medida válida.");
      return;
    }

    const calculatedPxPerCm = distancePx / realWidth;
    setPxPerCm(calculatedPxPerCm);
    setError(null);
    setTimeout(onNext, 2000); // Auto-proceed after 2 seconds
  };

  const handleRetake = () => {
    setImagePreview(null);
    setCurrentStep(1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Atrás
          </Button>
          <h1 className="text-2xl font-bold">Calibración del Sistema</h1>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[300px]">
                Calibre su sistema midiendo una longitud conocida en la imagen.
                Capture una imagen clara de un objeto de referencia (como una
                regla), marque sus extremos e ingrese su longitud real.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`${currentStep >= step.id ? "text-primary" : ""}`}
            >
              Paso {step.id}: {step.title}
            </div>
          ))}
        </div>
      </div>

      {!imagePreview ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative aspect-video w-full max-w-[640px] bg-gray-100 rounded-xl overflow-hidden">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ deviceId: selectedDeviceId || undefined }}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">
              Posicione el objeto de referencia dentro del marco
            </p>

            {devices.length > 1 && (
              <select
                className="bg-background border rounded-md p-2 text-sm"
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                value={selectedDeviceId || ""}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${device.deviceId}`}
                  </option>
                ))}
              </select>
            )}

            <Button onClick={captureImage} size="lg" className="gap-2">
              Capturar Imagen de Referencia
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-full max-w-[640px] mx-auto">
            <div
              className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-crosshair"
              onClick={handleImageClick}
            >
              <img
                src={imagePreview}
                alt="Calibration reference"
                className="w-full h-full object-contain"
              />

              {points.map((point, index) => (
                <div
                  key={index}
                  className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: point.y, left: point.x }}
                >
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-primary">
                    Punto {index + 1}
                  </span>
                </div>
              ))}

              {points.length === 2 && (
                <>
                  <div
                    className="absolute h-1 bg-primary/50"
                    style={{
                      left: points[0].x,
                      top: points[0].y,
                      width: distancePx ?? 0,
                      transform: `rotate(${Math.atan2(
                        points[1].y - points[0].y,
                        points[1].x - points[0].x
                      )}rad)`,
                      transformOrigin: "0 50%",
                    }}
                  />
                  <div
                    className="absolute text-xs font-medium bg-primary/90 text-white px-2 py-1 rounded"
                    style={{
                      left: (points[0].x + points[1].x) / 2,
                      top: (points[0].y + points[1].y) / 2,
                    }}
                  >
                    {distancePx?.toFixed(1)} px
                  </div>
                </>
              )}
            </div>

            <div className="absolute -top-2 -right-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetake}
                className="text-muted-foreground gap-1"
              >
                <RotateCw className="w-4 h-4" />
                Volver a tomar
              </Button>
            </div>
          </div>

          {currentStep >= 2 && (
            <div className="max-w-[300px] mx-auto space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    Longitud Real ({points.length === 2 ? "cm" : "..."})
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Ingrese la longitud real entre los dos puntos marcados en
                      centímetros.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Input
                  type="number"
                  step="0.01"
                  placeholder="ej., 15.5 cm"
                  value={realWidth ?? ""}
                  onChange={(e) => setRealWidth(parseFloat(e.target.value))}
                  className="text-center text-lg font-medium h-12"
                />
              </div>

              {pxPerCm ? (
                <div className="animate-in fade-in">
                  <Alert className="border-green-600 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>¡Calibración Completada!</AlertTitle>
                    <AlertDescription>
                      {pxPerCm.toFixed(2)} px/cm - Procediendo al análisis...
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Button
                  onClick={handleCalibration}
                  className="w-full gap-2"
                  size="lg"
                  disabled={!realWidth || realWidth <= 0}
                >
                  Confirmar Calibración
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="animate-in fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
