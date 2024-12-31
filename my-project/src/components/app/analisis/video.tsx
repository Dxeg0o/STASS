import { useEffect, useRef } from "react";
import { useState } from "react";
import Webcam from "react-webcam";

export default function VideoFeed() {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const sendImageToBackend = async (image: string) => {
    try {
      // Extraer solo el contenido base64
      const base64Data = image.split(",")[1]; // Remover el prefijo 'data:image/jpeg;base64,'
      const response = await fetch("https://stass-api.vercel.app/asparagus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data); // Assuming the backend returns { labels: [{ description, score }] }
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
        // Solicitar permisos de cámara
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
