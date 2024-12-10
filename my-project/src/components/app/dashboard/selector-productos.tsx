"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProductSelector() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Seleccionar producto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asparagus">Espárragos</SelectItem>
        <SelectItem value="blueberries">Arándanos</SelectItem>
        <SelectItem value="grapes">Uvas</SelectItem>
      </SelectContent>
    </Select>
  )
}