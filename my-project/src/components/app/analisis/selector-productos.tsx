"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="space-y-4">
      <Select onValueChange={handleProductChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar producto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asparagus">Espárragos</SelectItem>
          <SelectItem value="blueberries">Arándanos</SelectItem>
          <SelectItem value="grapes">Uvas</SelectItem>
        </SelectContent>
      </Select>

      {selectedProduct && (
        <div className="space-y-2">
          <div className="grid-cols-2 grid gap-4">
            <div>
              <label className="block text-sm font-medium">
                Largo mínimo (cm):
              </label>
              <input
                type="number"
                className="border rounded-md p-2 w-full"
                value={minLength ?? ""}
                onChange={(e) => handleMinLengthChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Largo máximo (cm):
              </label>
              <input
                type="number"
                className="border rounded-md p-2 w-full"
                value={maxLength ?? ""}
                onChange={(e) => handleMaxLengthChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid-cols-2 grid gap-4">
            <div>
              <label className="block text-sm font-medium">
                Ancho mínimo (cm):
              </label>
              <input
                type="number"
                className="border rounded-md p-2 w-full"
                value={minWidth ?? ""}
                onChange={(e) => handleMinWidthChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Ancho máximo (cm):
              </label>
              <input
                type="number"
                className="border rounded-md p-2 w-full"
                value={maxWidth ?? ""}
                onChange={(e) => handleMaxWidthChange(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
