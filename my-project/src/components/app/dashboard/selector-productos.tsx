"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductSelectorProps = {
  onProductSelect: (productId: string) => void;
};

export function ProductSelector({ onProductSelect }: ProductSelectorProps) {
  const handleValueChange = (value: string) => {
    onProductSelect(value); // Comunica el valor seleccionado al componente padre
  };

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Seleccionar producto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asparagus">Espárragos</SelectItem>
        <SelectItem value="blueberries">Arándanos</SelectItem>
        <SelectItem value="grapes">Uvas</SelectItem>
      </SelectContent>
    </Select>
  );
}
