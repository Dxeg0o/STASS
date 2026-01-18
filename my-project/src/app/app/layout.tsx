// app/layout.tsx (o tu archivo de layout principal para la app interna)
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation"; // Importante para cerrar sidebar en cambio de ruta
import { AppSidebar } from "@/components/app/AppSidebar"; // Ajusta la ruta
import { AppNavbar } from "@/components/app/AppNavbar"; // Ajusta la ruta
import AuthContext from "../context/AuthContext"; // Ajusta la ruta
import { ServicioProvider } from "../context/ServicioContext";
import ProtectedRoute from "./ProtectedRoute"; // Ajusta laruta

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Cerrar el sidebar en móviles cuando cambia la ruta
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AuthContext>
      <ServicioProvider>
        {" "}
        {/* AuthContext envuelve todo */}
        <ProtectedRoute>
          {" "}
          {/* ProtectedRoute después de AuthContext */}
          <div className="flex min-h-screen flex-col bg-slate-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-cyan-500/20 rounded-[100%] blur-[100px] opacity-20 pointer-events-none z-0" />

            {/* Navbar Fijo */}
            <div className="relative z-20">
              <AppNavbar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
              />
            </div>
            
            <div className="flex flex-1 pt-16 relative z-10">
              {" "}
              {/* pt-16 para compensar altura del navbar */}
              {/* Sidebar */}
              <AppSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
              
              {/* Overlay para el contenido cuando el sidebar está abierto en móviles */}
              {isSidebarOpen && (
                <div
                  onClick={toggleSidebar}
                  className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
                  aria-hidden="true"
                />
              )}
              {/* Contenido Principal */}
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                {/* El div que tenías para centrar ya no es necesario aquí, se maneja por página */}
                {children}
              </main>
            </div>
          </div>
        </ProtectedRoute>
      </ServicioProvider>
    </AuthContext>
  );
}
