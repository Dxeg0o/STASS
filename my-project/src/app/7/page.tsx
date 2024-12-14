"use client";
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";

export default function CustomWebcam() {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<
    { description: string; score: number }[] | null
  >(null);

  // Obtener la lista de dispositivos de video
  useEffect(() => {
    const getDevices = async () => {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId); // Seleccionar la primera cámara por defecto
      }
    };

    getDevices();
  }, []);

  // Función para enviar la imagen al backend
  const sendImageToBackend = async (image: string) => {
    try {
      // Extraer solo el contenido base64
      const base64Data = image.split(",")[1]; // Remover el prefijo 'data:image/jpeg;base64,'
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResults(data.labels); // Assuming the backend returns { labels: [{ description, score }] }
      } else {
        console.error("Failed to send image to backend");
      }
    } catch (error) {
      console.error("Error sending image to backend:", error);
    }
  };

  // Capturar una imagen periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          sendImageToBackend(imageSrc);
        }
      }
    }, 5000); // Captura cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-5xl font-bold text-center mb-12">Cris Weko</h1>

      {/* Selector de cámaras */}
      <select
        className="mb-4 p-2 border rounded"
        onChange={(e) => setSelectedDeviceId(e.target.value)}
        value={selectedDeviceId || ""}
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>

      {/* Webcam */}
      {selectedDeviceId && (
        <Webcam
          ref={webcamRef}
          videoConstraints={{ deviceId: selectedDeviceId }}
          width={640} // Cambiar resolución
          height={480}
          screenshotFormat="image/jpeg"
        />
      )}

      {/* Mostrar resultados del análisis */}
      {analysisResults && (
        <div className="mt-8 p-4 border rounded bg-gray-100">
          <h2 className="text-lg font-bold">Analysis Results:</h2>
          <ul className="list-disc ml-4">
            {analysisResults.map((result, index) => (
              <li key={index}>
                {result.description} - {Math.round(result.score * 100)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
