"use client";

import { createContext, useContext, useState } from "react";

export interface Servicio {
  id: string;
  nombre: string;
}

interface ServicioContextType {
  servicio: Servicio | null;
  setServicio: (servicio: Servicio | null) => void;
}

const ServicioContext = createContext<ServicioContextType | undefined>(
  undefined
);

export function ServicioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [servicio, setServicio] = useState<Servicio | null>(null);
  return (
    <ServicioContext.Provider value={{ servicio, setServicio }}>
      {children}
    </ServicioContext.Provider>
  );
}

export function useServicio() {
  const context = useContext(ServicioContext);
  if (!context) {
    throw new Error("useServicio must be used within a ServicioProvider");
  }
  return context;
}

export default ServicioContext;
