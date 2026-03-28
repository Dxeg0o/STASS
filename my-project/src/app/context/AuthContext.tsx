"use client";

import axios from "axios";
import { getCookie } from "cookies-next";
import { useState, createContext, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface EmpresaInfo {
  empresaId: string;
  empresaNombre: string | null;
  rol: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  empresaId: string | null;
  empresaNombre: string | null;
  serviceTypes: string[];
  rol_usuario: string;
  empresas: EmpresaInfo[];
}

interface State {
  loading: boolean;
  data: User | null;
  error: string | null;
}

interface AuthState extends State {
  setAuthState?: React.Dispatch<React.SetStateAction<State>>;
  selectEmpresa?: (empresaId: string) => Promise<void>;
  switchEmpresa?: () => void;
}

export const AuthenticationContext = createContext<AuthState>({
  loading: false,
  error: null,
  data: null,
});

export default function AuthContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authState, setAuthState] = useState<State>({
    loading: true,
    data: null,
    error: null,
  });
  const router = useRouter();

  const fetchUser = async (empresaId?: string) => {
    setAuthState({
      data: null,
      error: null,
      loading: true,
    });
    try {
      const token = getCookie("token");

      if (!token) {
        return setAuthState({
          data: null,
          error: null,
          loading: false,
        });
      }

      // Check localStorage for persisted empresa selection
      const savedEmpresaId = empresaId || localStorage.getItem("selectedEmpresaId");
      const url = savedEmpresaId
        ? `/api/auth/me?empresaId=${savedEmpresaId}`
        : `/api/auth/me`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const data = response.data;
      setAuthState({
        data: {
          id: data.id,
          name: data.name,
          email: data.mail,
          isSuperAdmin: data.isSuperAdmin,
          empresaId: data.empresaId,
          empresaNombre: data.empresaNombre,
          serviceTypes: data.serviceTypes || [],
          rol_usuario: data.rol_usuario,
          empresas: data.empresas || [],
        },
        error: null,
        loading: false,
      });

      // Persist empresa selection
      if (data.empresaId) {
        localStorage.setItem("selectedEmpresaId", data.empresaId);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setAuthState({
          data: null,
          error:
            error.response?.data?.errorMessage || "An unknown error occurred.",
          loading: false,
        });
      } else {
        setAuthState({
          data: null,
          error: "An unexpected error occurred.",
          loading: false,
        });
      }
    }
  };

  const selectEmpresa = useCallback(async (empresaId: string) => {
    await fetchUser(empresaId);
  }, []);

  const switchEmpresa = useCallback(() => {
    localStorage.removeItem("selectedEmpresaId");
    setAuthState((prev) => ({
      ...prev,
      data: prev.data
        ? {
            ...prev.data,
            empresaId: null,
            empresaNombre: null,
            serviceTypes: [],
            rol_usuario: "usuario",
          }
        : null,
    }));
    router.push("/select-empresa");
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthenticationContext.Provider
      value={{
        ...authState,
        setAuthState,
        selectEmpresa,
        switchEmpresa,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
