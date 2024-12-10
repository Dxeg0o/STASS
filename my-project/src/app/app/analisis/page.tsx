"use client";
import { useState } from "react";
import QualityControlDashboard from "@/components/app/analisis/dashboard";
import { ProductSelector } from "@/components/app/dashboard/selector-productos";
import { Button } from "@/components/ui/button";

export default function QualityControlPage() {
  const [productSelected, setProductSelected] = useState(false);

  const handleStart = () => {
    setProductSelected(true);
  };

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Comienza a analizar</h1>
      <p className="text-xl font-semibold mb-8">
        Elige cual de tus productos analizarás, y comienza a analizarlo.
      </p>

      {!productSelected ? (
        <div className="text-center">
          <ProductSelector />
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
