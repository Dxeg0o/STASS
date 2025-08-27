"use client";

import axios from "axios";
import { deleteCookie } from "cookies-next/client";
import { useRouter, usePathname } from "next/navigation";
import { useContext, type ComponentType, type SVGProps } from "react";
import { Home, Settings, Archive, LogOut, ChevronLeft } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { AuthenticationContext } from "../../app/context/AuthContext"; // Ajusta la ruta si es necesario
import { useServicio } from "@/app/context/ServicioContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// Definimos un tipo más específico para los iconos
type MenuItem = {
  title: string;
  url: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const mainItems: MenuItem[] = [
  { title: "Inicio", url: "/app", icon: Home },
  { title: "Lotes", url: "/app/lotes", icon: Archive },
];

const secondaryItems: MenuItem[] = [
  { title: "Configuraciones", url: "/app/configuraciones", icon: Settings },
];

interface AppSidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

export function AppSidebar({ isOpen, toggleSidebar }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setAuthState } = useContext(AuthenticationContext);
  const { servicios, selectedServicio, setSelectedServicio, loading } =
    useServicio();

  const handleLogout = async () => {
    try {
      // await axios.post("/api/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      deleteCookie("token", { path: "/" });
      delete axios.defaults.headers.common["Authorization"];
      setAuthState?.({ data: null, error: null, loading: false });
      router.push("/login");
    }
  };

  const commonLinkClasses =
    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out text-sm font-medium tracking-wide";
  const activeLinkClasses = "bg-amber-400 text-emerald-900 shadow-md";
  const inactiveLinkClasses =
    "text-emerald-100 hover:bg-emerald-600 hover:text-white";

  return (
    <aside
      className={clsx(
        "bg-emerald-800 text-white fixed inset-y-0 left-0 z-30 flex h-screen w-64 transform flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-lg",
        {
          "translate-x-0 shadow-2xl": isOpen,
          "-translate-x-full": !isOpen,
        }
      )}
    >
      {/* Header del Sidebar con nombre de la empresa y botón de cerrar para móviles */}
      <div className="flex h-16 items-center justify-between border-b border-emerald-600 px-4 md:px-6">
        <Link href="/app" className="text-xl font-bold text-emerald-100">
          AgroBulbs
        </Link>
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden text-amber-300 hover:text-amber-400 focus:outline-none"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* Contenido del Sidebar */}
      <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto p-4">
        {/* Selector de Servicio */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-emerald-300">
            Servicio
          </span>
          <Select
            value={selectedServicio?.id ?? "all"}
            onValueChange={(v) => {
              const svc = servicios.find((s) => s.id === v);
              setSelectedServicio(v === "all" ? null : svc || null);
            }}
            disabled={loading}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={loading ? "Cargando..." : "Todos"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {servicios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navegación Principal */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-emerald-300">
            Principal
          </span>
          <ul className="mt-2 space-y-1">
            {mainItems.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={clsx(
                    commonLinkClasses,
                    pathname === item.url
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  )}
                  onClick={toggleSidebar}
                >
                  <item.icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={pathname === item.url ? 2.5 : 2}
                  />
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Navegación Secundaria */}
        <div className="mt-auto">
          <span className="px-4 text-xs font-semibold uppercase text-emerald-300">
            Ajustes
          </span>
          <ul className="mt-2 space-y-1">
            {secondaryItems.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={clsx(
                    commonLinkClasses,
                    pathname === item.url
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  )}
                  onClick={toggleSidebar}
                >
                  <item.icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={pathname === item.url ? 2.5 : 2}
                  />
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
            {/* Item de Cerrar sesión */}
            <li>
              <button
                onClick={() => {
                  handleLogout();
                  if (toggleSidebar) toggleSidebar();
                }}
                className={clsx(
                  commonLinkClasses,
                  inactiveLinkClasses,
                  "w-full"
                )}
              >
                <LogOut className="mr-3 h-5 w-5 shrink-0" strokeWidth={2} />
                <span className="text-sm font-medium tracking-wide">
                  Cerrar sesión
                </span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
