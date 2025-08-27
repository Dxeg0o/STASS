"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AuthenticationContext } from "./AuthContext";

export interface Servicio {
  id: string;
  nombre: string;
}

interface ServicioState {
  servicios: Servicio[];
  selectedServicio: Servicio | null;
  loading: boolean;
  setSelectedServicio: (servicio: Servicio | null) => void;
}

export const ServicioContext = createContext<ServicioState>({
  servicios: [],
  selectedServicio: null,
  loading: false,
  setSelectedServicio: () => {},
});

export function ServicioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useContext(AuthenticationContext);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLoading(true);
    fetch(`/api/servicios?empresaId=${data.empresaId}`)
      .then((res) => res.json())
      .then((arr: Servicio[]) => setServicios(arr))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data]);

  return (
    <ServicioContext.Provider
      value={{ servicios, selectedServicio, loading, setSelectedServicio }}
    >
      {children}
    </ServicioContext.Provider>
  );
}

export function useServicio() {
  return useContext(ServicioContext);
}
