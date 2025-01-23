"use client";

import { useContext, useState } from "react";
import QualityControlDashboard from "@/components/app/analisis/dashboard";
import { Button } from "@/components/ui/button";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { ProductSelector } from "@/components/app/analisis/selector-productos";

export default function QualityControlPage() {
  const [productSelected, setProductSelected] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productParams, setProductParams] = useState<{
    minLength: number | undefined;
    maxLength: number | undefined;
    minWidth: number | undefined;
    maxWidth: number | undefined;
  } | null>(null);
  const { data } = useContext(AuthenticationContext);
  const [analisisId, setAnalisisId] = useState<string | null>(null);

  const handleStart = async () => {
    if (
      !selectedProduct ||
      !productParams?.minLength ||
      !productParams?.maxLength ||
      !productParams?.minWidth ||
      !productParams?.maxWidth
    ) {
      alert(
        "Por favor, selecciona un producto e ingresa todos los parámetros antes de comenzar."
      );
      return;
    }

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: data?.id_empresa,
          producto_id: selectedProduct,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Análisis creado:", data._id);
        setAnalisisId(data._id);

        setProductSelected(true);
      } else {
        const errorData = await response.json();
        console.error("Error en la API:", errorData.message);
        alert("Error al iniciar el análisis: " + errorData.message);
      }
    } catch (error) {
      console.error("Error al llamar a la API:", error);
      alert("Ocurrió un error inesperado. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="container px-4 py-8">
      {!productSelected ? (
        <div>
          <h1 className="text-3xl font-bold mb-2">Comienza a analizar</h1>
          <p className="text-xl font-semibold mb-8">
            Elige cuál de tus productos analizarás y especifica los parámetros.
          </p>

          <div className="text-center">
            <ProductSelector
              onParamsChange={(productId, params) => {
                setSelectedProduct(productId);
                setProductParams(params);
              }}
            />
            <Button
              onClick={handleStart}
              className="mt-12 hover:bg-black/60 text-xl font-semibold p-6"
            >
              Comenzar
            </Button>
          </div>
        </div>
      ) : (
        <QualityControlDashboard
          analisis_id={analisisId || ""}
          params={{
            minLength: productParams?.minLength,
            maxLength: productParams?.maxLength,
            minWidth: productParams?.minWidth,
            maxWidth: productParams?.maxWidth,
          }}
        />
      )}
    </div>
  );
}
