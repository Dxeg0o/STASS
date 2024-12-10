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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Control de Calidad STASS</h1>
      {!productSelected ? (
        <div className="text-center">
          <ProductSelector />
          <Button onClick={handleStart} className="mt-4">
            Comenzar
          </Button>
        </div>
      ) : (
        <QualityControlDashboard />
      )}
    </div>
  );
}
