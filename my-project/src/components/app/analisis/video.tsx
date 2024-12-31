import { useEffect, useRef } from "react";
import { useState } from "react";
import Webcam from "react-webcam";

export default function VideoFeed() {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Obtener la lista de dispositivos de video
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
          console.log(imageSrc);
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
