"use client";
import { useState, useEffect } from "react";
import axios from "axios";

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
  const [altura, setAltura] = useState(null);
  const [radio, setRadio] = useState(null);
  const [grafico, setGrafico] = useState(null);
  const [error] = useState(null);

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
        "http://127.0.0.1:5000/api/calculate",
        data
      );

      setAltura(response.data.altura);
      setRadio(response.data.radio);
      setGrafico(response.data.grafico);
    } catch (err) {
      console.error("Error al calcular:", err);
    }
  };

  return (
    <div>
      <h1>Calculadora de Espárragos</h1>
      {altura && <p>Altura: {altura}</p>}
      {radio && <p>Radio: {radio}</p>}
      {grafico && (
        <div>
          <h2>Gráfico:</h2>
          <img src={`data:image/png;base64,${grafico}`} alt="Gráfico" />
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
