// components/app/AppNavbar.tsx
"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface AppNavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function AppNavbar({ isSidebarOpen, toggleSidebar }: AppNavbarProps) {
  return (
    <nav className="bg-emerald-800 text-white shadow-md fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          {/* Botón para mostrar/ocultar sidebar en móviles */}
          <button
            onClick={toggleSidebar}
            className="md:hidden text-amber-300 hover:text-amber-400 focus:outline-none transition-colors"
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
              width={130}
              height={40}
              priority
              className="transition-opacity hover:opacity-90"
            />
          </Link>
        </div>
        <div className="flex items-center">{/* Ejemplo: <UserMenu /> */}</div>
      </div>
    </nav>
  );
}
