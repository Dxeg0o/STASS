import mongoose from "mongoose";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
interface VideoFeedProps {
  analisis_id: string;
}
export default function VideoFeed({ analisis_id }: VideoFeedProps) {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const sendImageToBackend = async (image: string) => {
    try {
      const base64Data = image.split(",")[1]; // Remove the prefix 'data:image/jpeg;base64,'
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

        // Define the type for the results array
        interface DetectionResult {
          detection_id: string;
          altura: number;
          radio: number;
        }

        // Ensure `results` exists and is an array
        const results: DetectionResult[] = Array.isArray(data.results)
          ? data.results
          : [];

        // Iterate over each detection in results
        const predictions = results.map((result: DetectionResult) => ({
          _id: new mongoose.Types.ObjectId().toString(),
          analisis_id: analisis_id, // Change this as per your context
          atributos: {
            tamaño: `${result.altura || "desconocido"} x ${
              result.radio || "desconocido"
            }`, // Example of combining height and radius
            color: "desconocido", // Placeholder as color isn't in the response
          },
          fecha: new Date(),
          resultado: "apto", // Placeholder, update based on your logic
          etiquetas: [], // Placeholder as labels aren't in the response
        }));

        // Save each prediction in MongoDB
        for (const prediccion of predictions) {
          const guardarPrediccion = await fetch("/api/predictions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(prediccion), // Send the prediction data here
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
