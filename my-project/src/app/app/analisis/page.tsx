"use client";

import { useContext, useState } from "react";
import QualityControlDashboard from "@/components/app/analisis/dashboard";
import { Button } from "@/components/ui/button";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { ProductSelector } from "@/components/app/analisis/selector-productos";
import { useRouter } from "next/navigation";
import Calibracion from "@/components/app/analisis/calibracion";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const steps = [
    "Selección de Producto",
    "Calibración",
    "Análisis en Tiempo Real",
  ];

  const handleStart = async () => {
    if (
      !selectedProduct ||
      !productParams?.minLength ||
      !productParams?.maxLength ||
      !productParams?.minWidth ||
      !productParams?.maxWidth
    ) {
      toast.error("Datos incompletos", {
        description: "Por favor completa todos los parámetros requeridos",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresaId: data?.empresaId,
          productoId: selectedProduct,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalisisId(data._id);
        setProductSelected(true);
        setStep(2);

        toast.success("Análisis iniciado", {
          description: "Configuración guardada correctamente",
        });
      } else {
        const errorData = await response.json();

        toast.error("Error al iniciar", {
          description: "Inténtalo de nuevo más tarde",
        });
      }
    } catch (error) {
      toast.error("Error de conexión", {
        description: "Verifica tu conexión a internet e inténtalo de nuevo",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-8 max-w-4xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-primary">Control de Calidad</h1>
        <div className="flex items-center gap-4">
          <Progress value={(step / steps.length) * 100} className="h-2" />
          <span className="text-sm text-muted-foreground">
            Paso {step} de {steps.length}: {steps[step - 1]}
          </span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Configuración Inicial</h2>
            <p className="text-muted-foreground">
              Selecciona el producto a analizar y define los parámetros de
              calidad requeridos.
            </p>
          </div>

          <ProductSelector
            onParamsChange={(productId, params) => {
              setSelectedProduct(productId);
              setProductParams(params);
            }}
          />

          <Button
            onClick={handleStart}
            className="w-full py-6 text-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando análisis...
              </>
            ) : (
              "Iniciar Análisis"
            )}
          </Button>
        </div>
      )}

      {step === 2 && (
        <Calibracion onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}

      {step === 3 && analisisId && (
        <QualityControlDashboard
          analisisId={analisisId}
          params={productParams!}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
