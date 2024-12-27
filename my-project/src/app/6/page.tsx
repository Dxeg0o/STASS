"use client";

import { useState, ChangeEvent } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  image: string;
  imageId: string;
}

export default function VideoObjectDetection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const generateImageId = () => Math.random().toString(36).slice(2, 9);

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
              currentTime += interval / 1000;

              video.addEventListener(
                "seeked",
                () => {
                  if (ctx) {
                    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
                    const dataURL = canvas.toDataURL("image/jpeg");
                    const imageId = generateImageId();
                    frames.push({ id: imageId, base64: dataURL.split(",")[1] });

                    setProgress((currentTime / duration) * 100);

                    if (currentTime <= duration) {
                      captureFrame();
                    } else {
                      resolve(frames);
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
    setResults([]);
    setIsProcessing(true);
    setProgress(0);

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

        setResults((prevResults) => [
          ...prevResults,
          {
            ...response.data,
            image: `data:image/jpeg;base64,${frame.base64}`,
            imageId: frame.id,
          } as ImageResult,
        ]);
      }
    } catch (error) {
      console.error("Error al procesar el video: ", error);
      setError(
        "Hubo un error al procesar el video. Por favor, intenta de nuevo."
      );
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Detección de Calidad de Espárragos en Video
      </h1>
      <Card className="w-full max-w-2xl mx-auto mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sube un video</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors duration-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-4 text-gray-500 dark:text-gray-400" />
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
            <p className="text-sm text-gray-500 mt-4">
              Archivo seleccionado: {selectedFile.name}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Procesar Video"
            )}
          </Button>
        </CardFooter>
      </Card>

      {isProcessing && (
        <div className="w-full max-w-2xl mx-auto mb-8">
          <Progress value={progress} className="w-full" />
          <p className="text-center mt-2">
            Procesando video: {Math.round(progress)}%
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, index) => (
            <Card key={result.imageId} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Frame {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={result.image}
                  alt={`Frame ${result.imageId}`}
                  className="w-full h-auto"
                />
                <Home imageResult={result} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-12 text-center text-gray-600">
        <p>
          &copy; {new Date().getFullYear()} QualiBlick Espárragos. Todos los
          derechos reservados.
        </p>
      </div>
    </div>
  );
}
