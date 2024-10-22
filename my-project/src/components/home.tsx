"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface Prediction {
  detection_id: string;
  altura: number;
  radio: number;
}

interface ImageResult {
  predictions: Array<{
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  image: string;
}

interface HomeProps {
  imageResult: ImageResult | null;
}

export default function Home({ imageResult }: HomeProps) {
  const [resultados, setResultados] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (imageResult) {
      calcular();
    }
  }, [imageResult]);

  const calcular = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!imageResult) {
        return;
      }

      const data = imageResult;

      const response = await axios.post(
        "https://firebase-functions-handler-to54ahtrgq-uc.a.run.app/api/calculate",
        data
      );

      setResultados(response.data.results);
    } catch (err) {
      console.error("Error al calcular:", err);
      setError("Hubo un error al calcular las dimensiones");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">Predicciones</h1>
        </header>

        <main className="max-w-3xl mx-auto">
          {isLoading ? (
            <Card className="p-8">
              <div className="flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Calculando...</span>
              </div>
            </Card>
          ) : resultados.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {resultados.map((resultado, index) => (
                <Card key={resultado.detection_id || index} className="w-full">
                  <CardHeader className="bg-primary/10 p-3">
                    <CardTitle className="text-lg font-semibold text-primary">
                      Predicción {index + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-base break-words">
                      <span className="font-semibold">Altura:</span>{" "}
                      {resultado.altura.toFixed(2)} cm
                    </p>
                    <p className="text-base break-words">
                      <span className="font-semibold">Radio:</span>{" "}
                      {resultado.radio.toFixed(2)} cm
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-md">
              <CardContent className="text-center py-8">
                <p className="text-lg text-gray-600">
                  No hay predicciones disponibles.
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </main>
      </div>
    </div>
  );
}
