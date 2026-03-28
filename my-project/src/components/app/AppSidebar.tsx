"use client";

import axios from "axios";
import { deleteCookie } from "cookies-next/client";
import { useRouter, usePathname } from "next/navigation";
import { useContext } from "react";
import {
  Home,
  Settings,
  LogOut,
  ChevronLeft,
  ClipboardList,
  Package,
  BarChart3,
  Gauge,
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
        "bg-slate-900/40 backdrop-blur-xl border-r border-white/10 text-white fixed inset-y-0 left-0 z-30 flex h-screen w-64 transform flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
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

        {/* Ajustes */}
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
