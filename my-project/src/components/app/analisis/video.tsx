import mongoose from "mongoose";
import Prediccion from "../../../models/predictions";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

interface Label {
  description: string;
}
interface Prediccion {
  _id: string;
  analisis_id: string;
  producto: string;
  atributos: {
    tamaño: string;
    color: string;
    peso: number;
    defecto_detectado: boolean;
  };
  fecha: Date;
  resultado: "apto" | "defectuoso";
  etiquetas: Array<{
    etiqueta_id: string;
    valor: string;
  }>;
}



export default function VideoFeed() {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const sendImageToBackend = async (image: string) => {
    try {
      const base64Data = image.split(",")[1]; // Remover el prefijo 'data:image/jpeg;base64,'
      const response = await fetch(
        "https://stass-apis.onrender.com/asparagus",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64Data }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Crear una predicción basada en la respuesta de la API
        const prediccion = {
          _id: new mongoose.Types.ObjectId().toString(),
          analisis_id: "analisis_123", // Cambia esto según el contexto
          producto: "Espárrago", // Cambia según el producto analizado
          atributos: {
            tamaño: data.size || "desconocido",
            color: data.color || "desconocido",
            peso: data.weight || 0,
            defecto_detectado: data.defecto || false,
          },
          fecha: new Date(),
          resultado: data.defecto ? "defectuoso" : "apto",
          etiquetas: data.labels.map((label: Label) => ({
            etiqueta_id: new mongoose.Types.ObjectId().toString(),
            valor: label.description || "desconocido",
          })),          
        };

        // Guardar en MongoDB
        await Prediccion.create(prediccion);

        console.log("Predicción guardada:", prediccion);
      } else {
        console.error("Failed to send image to backend");
      }
    } catch (error) {
      console.error("Error sending image to backend:", error);
    }
  };

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getDevices();
  }, []);

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
    <div className="bg-gray-200 aspect-video rounded-lg flex items-center justify-center flex-col">
      {selectedDeviceId && (
        <Webcam
          ref={webcamRef}
          videoConstraints={{ deviceId: selectedDeviceId }}
          width={640}
          height={480}
          screenshotFormat="image/jpeg"
        />
      )}
      <select
        className="my-3 p-2 border rounded"
        onChange={(e) => setSelectedDeviceId(e.target.value)}
        value={selectedDeviceId || ""}
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>
    </div>
  );
}
