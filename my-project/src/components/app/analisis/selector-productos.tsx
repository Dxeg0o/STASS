"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
type ProductSelectorProps = {
  onParamsChange: (
    productId: string | null,
    params: {
      minLength: number | undefined;
      maxLength: number | undefined;
      minWidth: number | undefined;
      maxWidth: number | undefined;
    }
  ) => void;
};

export function ProductSelector({ onParamsChange }: ProductSelectorProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [minLength, setMinLength] = useState<number | undefined>();
  const [maxLength, setMaxLength] = useState<number | undefined>();
  const [minWidth, setMinWidth] = useState<number | undefined>();
  const [maxWidth, setMaxWidth] = useState<number | undefined>();

  const handleProductChange = (value: string | null) => {
    setSelectedProduct(value);
    onParamsChange(value, { minLength, maxLength, minWidth, maxWidth });
  };

  const handleMinLengthChange = (value: number | undefined) => {
    setMinLength(value);
    onParamsChange(selectedProduct, {
      minLength: value,
      maxLength,
      minWidth,
      maxWidth,
    });
  };

  const handleMaxLengthChange = (value: number | undefined) => {
    setMaxLength(value);
    onParamsChange(selectedProduct, {
      minLength,
      maxLength: value,
      minWidth,
      maxWidth,
    });
  };

  const handleMinWidthChange = (value: number | undefined) => {
    setMinWidth(value);
    onParamsChange(selectedProduct, {
      minLength,
      maxLength,
      minWidth: value,
      maxWidth,
    });
  };

  const handleMaxWidthChange = (value: number | undefined) => {
    setMaxWidth(value);
    onParamsChange(selectedProduct, {
      minLength,
      maxLength,
      minWidth,
      maxWidth: value,
    });
  };

  return (
    <div className="space-y-6 p-6 bg-muted/50 rounded-lg">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">Selección de Producto</h3>
        <p className="text-sm text-muted-foreground">
          Elige un producto de tu catálogo para configurar sus parámetros
        </p>
      </div>

      <Select onValueChange={handleProductChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un producto..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asparagus">
            <span className="flex items-center gap-2">🥬 Espárragos</span>
          </SelectItem>
          <SelectItem value="blueberries">
            <span className="flex items-center gap-2">🫐 Arándanos</span>
          </SelectItem>
          <SelectItem value="grapes">
            <span className="flex items-center gap-2">🍇 Uvas</span>
          </SelectItem>
        </SelectContent>
      </Select>

      {selectedProduct && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              Parámetros de Calidad
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[300px]">
                    Define los rangos aceptables para el control de calidad
                  </p>
                </TooltipContent>
              </Tooltip>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ParameterInput
                label="Largo Mínimo (cm)"
                value={minLength}
                onChange={handleMinLengthChange}
                min={0}
                max={maxLength}
              />
              <ParameterInput
                label="Largo Máximo (cm)"
                value={maxLength}
                onChange={handleMaxLengthChange}
                min={minLength}
              />
              <ParameterInput
                label="Ancho Mínimo (cm)"
                value={minWidth}
                onChange={handleMinWidthChange}
                min={0}
                max={maxWidth}
              />
              <ParameterInput
                label="Ancho Máximo (cm)"
                value={maxWidth}
                onChange={handleMaxWidthChange}
                min={minWidth}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParameterInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = (currentValue: number | undefined) => {
    if (currentValue === undefined) {
      setError(null);
      return;
    }

    if (min !== undefined && currentValue < min) {
      setError(`El valor mínimo permitido es ${min}`);
    } else if (max !== undefined && currentValue > max) {
      setError(`El valor máximo permitido es ${max}`);
    } else {
      setError(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = inputValue === "" ? undefined : Number(inputValue);
    onChange(numericValue);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  const handleBlur = () => {
    setTouched(true);
    validate(value);
  };

  useEffect(() => {
    if (touched) {
      validate(value);
    }
  }, [min, max, value, touched]);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        className={`w-full p-2 border rounded-md ${
          error ? "border-destructive" : "border-input"
        }`}
        value={value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
