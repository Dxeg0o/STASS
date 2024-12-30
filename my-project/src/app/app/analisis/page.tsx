'use client'
import { useContext, useState } from "react";
import QualityControlDashboard from "@/components/app/analisis/dashboard";
import { ProductSelector } from "@/components/app/dashboard/selector-productos";
import { Button } from "@/components/ui/button";
import { AuthenticationContext } from "@/app/context/AuthContext";

export default function QualityControlPage() {
  const [productSelected, setProductSelected] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const { data, loading } = useContext(AuthenticationContext)
  const handleStart = async () => {
    if (!selectedProduct) {
      alert("Por favor, selecciona un producto antes de comenzar.");
      return;
    }

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: data?.id_empresa, // Reemplazar con el ID de la empresa correcto
          producto_id: selectedProduct,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Análisis creado:", data);
        setProductSelected(true); // Cambiar la vista a QualityControlDashboard
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
      <h1 className="text-3xl font-bold mb-2">Comienza a analizar</h1>
      <p className="text-xl font-semibold mb-8">
        Elige cual de tus productos analizarás, y comienza a analizarlo.
      </p>

      {!productSelected ? (
        <div className="text-center">
          <ProductSelector
            onProductSelect={(productId: string) => setSelectedProduct(productId)}
          />
          <Button
            onClick={handleStart}
            className="mt-12 hover:bg-black/60 text-xl font-semibold p-6"
          >
            Comenzar
          </Button>
        </div>
      ) : (
        <QualityControlDashboard />
      )}
    </div>
  );
}
