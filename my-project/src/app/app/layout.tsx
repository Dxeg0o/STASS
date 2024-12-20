"use client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { useEffect } from "react";

// Importamos los componentes necesarios para el sidebar y las funciones de React y Next.js.

export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem("token");
    // Intentamos obtener el token almacenado en el localStorage del navegador.

    if (!token) {
      window.location.href = "/login";
      // Si no hay un token, redirigimos al usuario a la página de login de manera normal.
    }
  }, []);
  // El useEffect se ejecuta cuando el componente se monta, verificando la existencia del token.

  return (
    <SidebarProvider>
      <div className="min-w-full min-h-screen flex flex-col">
        <nav className="w-full h-14 border-b bg-gray-50 flex items-center px-4">
          <h1 className="font-semibold">QualiBlick</h1>
        </nav>
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1">
            <SidebarTrigger />
            <div className="flex flex-col justify-center items-center">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
  // Si el token es válido, renderizamos el layout con el sidebar y el contenido principal.
}
