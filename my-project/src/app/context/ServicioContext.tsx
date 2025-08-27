"use client";

import { createContext, useState, type ReactNode } from "react";

export interface Servicio {
  id: string;
  nombre: string;
}

interface ServicioContextType {
  selectedServicio: Servicio | null;
  setSelectedServicio: (servicio: Servicio | null) => void;
}

export const ServicioContext = createContext<ServicioContextType>({
  selectedServicio: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSelectedServicio: () => {},
});

export function ServicioProvider({ children }: { children: ReactNode }) {
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);

  return (
    <ServicioContext.Provider value={{ selectedServicio, setSelectedServicio }}>
      {children}
    </ServicioContext.Provider>
  );
}
