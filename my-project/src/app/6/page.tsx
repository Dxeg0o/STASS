"use client";

import { useState, ChangeEvent } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import axios from "axios";
import Home from "@/components/home";

// Define a type for the result (you can adjust this based on the actual response structure)
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

export default function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
      handleSubmit(); // Automáticamente envía el archivo
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!selectedFile) {
      setError("Por favor selecciona una imagen primero");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      try {
        const imageBase64 = reader.result?.toString().split(",")[1];

        if (!imageBase64) {
          throw new Error("Hubo un error al procesar la imagen");
        }

        const response = await axios({
          method: "POST",
          url: "https://detect.roboflow.com/try2-u4gn9/1",
          params: {
            api_key: "xhZowC0XhfVttIdmFHKU",
          },
          data: imageBase64,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        setResult(response.data as ImageResult); // Guardamos el resultado aquí
      } catch (error) {
        console.error("Error al procesar la imagen: ", error);
        setError(
          "Hubo un error al procesar la imagen. Por favor, intenta de nuevo."
        );
      } finally {
      }
    };
  };

  return (
    <div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sube una imagen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Haz clic para subir</span> o
                  arrastra y suelta
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SVG, PNG, JPG or GIF (MAX. 800x400px)
                </p>
              </div>
              <Input
                id="dropzone-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange} // Aquí se hace la carga automática
              />
            </label>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-500">
              Archivo seleccionado: {selectedFile.name}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
      {/* Renderizamos el componente Home pasando el result */}
      {result && <Home imageResult={result} />} {/* Automáticamente se llama */}
    </div>
  );
}
