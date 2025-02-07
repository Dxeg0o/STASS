import mongoose from "mongoose";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
interface SubLabel {
  id: string;
  value: string;
}

interface Label {
  name: string;
  subLabels?: SubLabel[];
}
interface VideoFeedProps {
  analisisId: string;
  params: {
    minLength: number;
    maxLength: number;
    minWidth: number;
    maxWidth: number;
  };
  selectedLabels: Label[]; // Ahora usa la definición unificada
  onError?: (message: string) => void;
}

export default function VideoFeed({
  analisisId,
  params,
  selectedLabels,
}: VideoFeedProps) {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const { minLength, maxLength, minWidth, maxWidth } = params;

  const sendImageToBackend = useCallback(
    async (image: string) => {
      try {
        if (
          minWidth === undefined ||
          maxWidth === undefined ||
          minLength === undefined ||
          maxLength === undefined
        ) {
          console.error(
            "Los parámetros de rango no están completamente definidos."
          );
          return;
        }
        const base64Data = image.split(",")[1];
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
          console.log(data);

          interface DetectionResult {
            detection_id: string;
            altura: number;
            radio: number;
          }

          const results: DetectionResult[] = Array.isArray(data.results)
            ? data.results
            : [];

          const predictions = results.map((result: DetectionResult) => {
            const [minSize, maxSize] = [result.altura, result.radio].sort(
              (a, b) => a - b
            );
            const width = minSize;
            const length = maxSize;
            const isWidthValid = width >= minWidth && width <= maxWidth;
            const isLengthValid = length >= minLength && length <= maxLength;

            // Extrae el id de cada subetiqueta seleccionada
            const subetiquetas = selectedLabels.flatMap((label) =>
              label.subLabels
                ? label.subLabels.filter(Boolean).map((sub) => sub.id)
                : []
            );

            if (!isWidthValid) {
              console.log(
                `Ancho fuera de rango: Ancho=${width}, Diferencia=${
                  width < minWidth ? minWidth - width : width - maxWidth
                }`
              );
            }

            if (!isLengthValid) {
              console.log(
                `Largo fuera de rango: Largo=${length}, Diferencia=${
                  length < minLength ? minLength - length : length - maxLength
                }`
              );
            }
            return {
              _id: new mongoose.Types.ObjectId().toString(),
              analisisId: analisisId,
              atributos: {
                tamaño: `${length} x ${width}`,
                color: "desconocido",
              },
              fecha: new Date(),
              resultado: isWidthValid && isLengthValid ? "apto" : "no apto",
              subetiquetas: subetiquetas.map((id) => ({ subetiquetaId: id })),
            };
          });

          for (const prediccion of predictions) {
            const guardarPrediccion = await fetch("/api/predictions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(prediccion),
            });

            if (guardarPrediccion.ok) {
              const result = await guardarPrediccion.json();
              console.log("Prediction saved:", result);
            } else {
              console.error(
                "Failed to save prediction in MongoDB:",
                guardarPrediccion.statusText
              );
            }
          }
        } else {
          console.error("Failed to send image to backend");
        }
      } catch (error) {
        console.error("Error sending image to backend:", error);
      }
    },
    [analisisId, minLength, maxLength, minWidth, maxWidth, selectedLabels]
  );

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
    }, 5000);

    return () => clearInterval(interval);
  }, [sendImageToBackend]);

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
