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

interface ImageResult {
  predictions: Array<{
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  image: string; // Añadimos la imagen para asociarla con el resultado
  imageId: string; // Identificador único para cada imagen
}

export default function VideoUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]); // Almacena el archivo de video seleccionado
      setError(null);
    }
  };

  // Función para generar un identificador único para cada frame
  const generateImageId = () => {
    return Math.random().toString(36).slice(2, 9);
  };

  // Función para procesar el video en múltiples frames
  const extractFramesFromVideo = (videoFile: File, interval = 1000) => {
    return new Promise<Array<{ id: string; base64: string }>>(
      (resolve, reject) => {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(videoFile);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const frames: Array<{ id: string; base64: string }> = [];

        video.addEventListener("loadeddata", () => {
          const { videoWidth, videoHeight } = video;
          canvas.width = videoWidth;
          canvas.height = videoHeight;

          let currentTime = 0;
          const duration = video.duration;

          const captureFrame = () => {
            if (currentTime <= duration) {
              video.currentTime = currentTime;
              currentTime += interval / 1000; // Avanza el tiempo en intervalos

              video.addEventListener(
                "seeked",
                () => {
                  if (ctx) {
                    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
                    const dataURL = canvas.toDataURL("image/jpeg");
                    const imageId = generateImageId(); // Genera un ID único para el frame
                    frames.push({ id: imageId, base64: dataURL.split(",")[1] }); // Añade el frame y su ID

                    if (currentTime <= duration) {
                      captureFrame();
                    } else {
                      resolve(frames); // Termina cuando se capturan todos los frames
                    }
                  }
                },
                { once: true }
              );
            }
          };

          captureFrame();
        });

        video.addEventListener("error", (err) => reject(err));
      }
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Por favor selecciona un video primero");
      return;
    }

    setError(null);
    setResults([]); // Reseteamos los resultados

    try {
      const frames = await extractFramesFromVideo(selectedFile);

      for (const frame of frames) {
        const response = await axios({
          method: "POST",
          url: "https://detect.roboflow.com/try2-u4gn9/1",
          params: {
            api_key: "xhZowC0XhfVttIdmFHKU",
          },
          data: frame.base64,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        // Guardamos el resultado con su imagen correspondiente
        setResults((prevResults) => [
          ...prevResults,
          {
            ...response.data,
            image: `data:image/jpeg;base64,${frame.base64}`, // Almacenamos la imagen en base64
            imageId: frame.id, // Asociamos el ID de la imagen
          } as ImageResult,
        ]);
      }
    } catch (error) {
      console.error("Error al procesar el video: ", error);
      setError(
        "Hubo un error al procesar el video. Por favor, intenta de nuevo."
      );
    }
  };

  return (
    <div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sube un video</CardTitle>
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
                  Video MP4, WebM, (MAX. 10MB)
                </p>
              </div>
              <Input
                id="dropzone-file"
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={handleFileChange}
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
      {selectedFile && (
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleSubmit}
        >
          Procesar Video
        </button>
      )}
      {results.length > 0 &&
        results.map((result, index) => (
          <div key={index}>
            <img src={result.image} alt={`Frame ${result.imageId}`} />
            <Home key={result.imageId} imageResult={result} />
          </div>
        ))}
    </div>
  );
}
