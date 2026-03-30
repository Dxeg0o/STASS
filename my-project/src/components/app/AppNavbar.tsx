// components/app/AppNavbar.tsx
"use client";

import { Menu, X, Building2, ArrowLeftRight, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useContext } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";

interface AppNavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function AppNavbar({ isSidebarOpen, toggleSidebar }: AppNavbarProps) {
  const { data, switchEmpresa } = useContext(AuthenticationContext);

  const hasMultipleEmpresas =
    data && (data.empresas.length > 1 || data.isSuperAdmin);

  return (
    <nav className="bg-slate-950/80 backdrop-blur-md border-b border-white/10 text-white fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          {/* Botón para mostrar/ocultar sidebar en móviles */}
          <button
            onClick={toggleSidebar}
            className="md:hidden text-cyan-400 hover:text-cyan-300 focus:outline-none transition-colors"
            aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          {/* Logo de la empresa en navbar */}
          <Link href="/app" className="flex items-center">
            <Image
              src="/images/qb.png"
              alt={`Qualiblick Logo`}
              width={100}
              height={32}
              priority
              className="transition-opacity hover:opacity-90 h-8 w-auto"
            />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {/* Empresa actual */}
          {data?.empresaNombre && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-white/10 rounded-lg">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">
                  {data.empresaNombre}
                </span>
              </div>
              {hasMultipleEmpresas && (
                <button
                  onClick={() => switchEmpresa?.()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Cambiar empresa"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cambiar</span>
                </button>
              )}
            </div>
          )}
          {/* Admin link */}
          {data?.isSuperAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition-all border border-amber-500/20"
              title="Panel Administrador"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
