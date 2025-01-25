"use client";

import { useState, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Calibracion() {
  const router = useRouter(); // Para manejar la navegación
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [distancePx, setDistancePx] = useState<number | null>(null);
  const [realWidth, setRealWidth] = useState<number | null>(null);
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setPoints([]);
        setDistancePx(null);
        setPxPerCm(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!imagePreview) return;

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
      }
      return newPoints.length > 2 ? [{ x, y }] : newPoints;
    });
  };

  const handleCalibration = () => {
    if (!distancePx || !realWidth || realWidth <= 0) {
      setError("Selecciona dos puntos y proporciona un valor real válido.");
      return;
    }

    const calculatedPxPerCm = distancePx / realWidth;
    setPxPerCm(calculatedPxPerCm);
    setError(null);
    alert(`Calibración exitosa: ${calculatedPxPerCm.toFixed(2)} px/cm`);
  };

  const handleRealWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      setRealWidth(value);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Calibrar Imagen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!imagePreview && (
            <label
              htmlFor="upload-image"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                </p>
                <p className="text-xs text-gray-500">SVG, PNG, JPG o GIF</p>
              </div>
              <Input
                id="upload-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {imagePreview && (
            <div
              className="relative w-full h-64 border rounded-lg cursor-crosshair"
              onClick={handleImageClick}
            >
              <Image
                src={imagePreview}
                alt="Vista previa"
                layout="fill"
                objectFit="contain"
              />
              {points.map((point, index) => (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    width: "10px",
                    height: "10px",
                    backgroundColor: "red",
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    top: point.y,
                    left: point.x,
                  }}
                ></div>
              ))}
              {points.length === 2 && (
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <line
                    x1={points[0].x}
                    y1={points[0].y}
                    x2={points[1].x}
                    y2={points[1].y}
                    stroke="red"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
          )}

          {distancePx && (
            <div>
              <p className="text-sm text-gray-500">
                Distancia medida: {distancePx.toFixed(2)} px
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitud real de la línea (cm):
                </label>
                <Input
                  type="number"
                  step="0.01"
                  onChange={handleRealWidthChange}
                  placeholder="Ejemplo: 10.5"
                />
              </div>
              <Button onClick={handleCalibration} className="w-full mt-2">
                Calibrar
              </Button>
            </div>
          )}

          {pxPerCm && (
            <div className="mt-4">
              <p className="text-sm text-green-600">
                Relación píxeles/cm: {pxPerCm.toFixed(2)} px/cm
              </p>
            </div>
          )}

          <Button
            className="w-full mt-4"
            onClick={() => router.push("/app/analisis")}
          >
            Volver a análisis
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
