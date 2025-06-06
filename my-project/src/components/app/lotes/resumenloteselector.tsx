"use client";

import React from "react";
import { LoteSelector, type Lote } from "./loteselector";

interface ResumenLoteSelectorProps {
  lotes: Lote[];
  selectedLote: Lote | null;
  loading: boolean;
  onSelect: (lote: Lote) => void;
  onSelectNone: () => void;
}

export function ResumenLoteSelector(props: ResumenLoteSelectorProps) {
  return (
    <LoteSelector
      {...props}
      onCreate={undefined}
      title="Lote seleccionado"
      infoLabel="Datos de:"
      actionLabel="Ver otro lote"
      description="*Recuerda que acá solo estás viendo los datos, no cambiando el lote activo"
    />
  );
}
