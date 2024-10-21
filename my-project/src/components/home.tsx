"use client";
import { useState, useEffect } from "react";
import axios from "axios";

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

  useEffect(() => {
    if (imageResult) {
      calcular(); // Ejecuta el cálculo automáticamente si hay un result
    }
  }, [imageResult]);

  const calcular = async () => {
    try {
      if (!imageResult) {
        return;
      }

      const data = imageResult; // Usamos el result pasado como prop

      const response = await axios.post(
        "https://firebase-functions-handler-to54ahtrgq-uc.a.run.app/api/calculate",
        data
      );

      setResultados(response.data.results);
    } catch (err) {
      console.error("Error al calcular:", err);
      setError("Hubo un error al calcular las dimensiones");
    }
  };

  return (
    <div>
      <h1>Calculadora de Espárragos</h1>
      {resultados.length > 0 ? (
        resultados.map((resultado, index) => (
          <div key={resultado.detection_id || index}>
            <h3>Predicción {index + 1}</h3>
            <p>Altura: {resultado.altura.toFixed(2)} cm</p>
            <p>Radio: {resultado.radio.toFixed(2)} cm</p>
          </div>
        ))
      ) : (
        <p>No hay predicciones disponibles.</p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
