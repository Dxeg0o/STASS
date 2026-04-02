"use client";

import axios from "axios";
import { deleteCookie } from "cookies-next/client";
import { useRouter, usePathname } from "next/navigation";
import { useContext, useState, useRef, useEffect } from "react";
import {
  Home,
  Settings,
  LogOut,
  ChevronLeft,
  ClipboardList,
  Package,
  BarChart3,
  Gauge,
  User,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { AuthenticationContext } from "../../app/context/AuthContext";

interface AppSidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

export function AppSidebar({ isOpen, toggleSidebar }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, setAuthState } = useContext(AuthenticationContext);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      // await axios.post("/api/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      localStorage.removeItem("selectedEmpresaId");
      deleteCookie("token", { path: "/" });
      delete axios.defaults.headers.common["Authorization"];
      setAuthState?.({ data: null, error: null, loading: false });
      router.push("/login");
    }
  };

  const commonLinkClasses =
    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out text-sm font-medium tracking-wide";
  const activeLinkClasses =
    "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]";
  const inactiveLinkClasses =
    "text-slate-400 hover:bg-white/5 hover:text-white";

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const isActiveExact = (url: string) => pathname === url;

  return (
    <aside
      className={clsx(
        "bg-slate-900/40 backdrop-blur-xl border-r border-white/10 text-white fixed inset-y-0 left-0 z-30 flex h-screen w-64 transform flex-col transition-transform duration-300 ease-in-out md:relative md:h-full md:translate-x-0",
        {
          "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,0.5)]": isOpen,
          "-translate-x-full": !isOpen,
        }
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 md:px-6 bg-slate-950/20">
        <Link
          href="/app"
          className="text-xl font-bold text-white tracking-tight"
        >
          Qualiblick
        </Link>
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden text-cyan-400 hover:text-cyan-300 focus:outline-none"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto p-4">
        {/* Overview */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Overview
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/app"
                className={clsx(
                  commonLinkClasses,
                  isActiveExact("/app")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Home
                  className="h-5 w-5 shrink-0"
                  strokeWidth={isActiveExact("/app") ? 2.5 : 2}
                />
                <span>Inicio</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Operaciones */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Operaciones
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/app/procesos"
                className={clsx(
                  commonLinkClasses,
                  isActive("/app/procesos")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <ClipboardList className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Procesos</span>
              </Link>
            </li>
            <li>
              <Link
                href="/app/lotes"
                className={clsx(
                  commonLinkClasses,
                  isActive("/app/lotes")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Package className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Lotes</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Inteligencia */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Inteligencia
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/app/analitica"
                className={clsx(
                  commonLinkClasses,
                  isActive("/app/analitica")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <BarChart3 className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Analítica</span>
              </Link>
            </li>
            <li>
              <Link
                href="/app/control"
                className={clsx(
                  commonLinkClasses,
                  isActive("/app/control")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Gauge className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Control Operacional</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Ajustes de empresa */}
        <div className="mt-auto">
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Ajustes
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/app/configuraciones"
                className={clsx(
                  commonLinkClasses,
                  isActive("/app/configuraciones")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Configuraciones</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Usuario */}
      <div ref={userMenuRef} className="relative border-t border-white/10">
        {/* Dropdown menu */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
            <Link
              href="/app/perfil"
              onClick={() => {
                setUserMenuOpen(false);
                if (toggleSidebar) toggleSidebar();
              }}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Configuraciones de usuario</span>
            </Link>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                handleLogout();
                if (toggleSidebar) toggleSidebar();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Botón de usuario */}
        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-white/5 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-cyan-400">
              {data?.name?.charAt(0).toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">{data?.name}</p>
            <p className="text-xs text-slate-500 truncate">{data?.email}</p>
          </div>
          <ChevronUp
            className={clsx(
              "w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-all shrink-0",
              userMenuOpen ? "rotate-0" : "rotate-180"
            )}
          />
        </button>
      </div>
    </aside>
  );
}
