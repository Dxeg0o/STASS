"use client";

import axios from "axios";
import { deleteCookie } from "cookies-next/client";
import { useRouter, usePathname } from "next/navigation";
import { useContext } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Cpu,
  ArrowLeft,
  LogOut,
  ChevronLeft,
  Shield,
  Link2,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { AuthenticationContext } from "@/app/context/AuthContext";

interface AdminSidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

export function AdminSidebar({ isOpen, toggleSidebar }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setAuthState } = useContext(AuthenticationContext);

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
    "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
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
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="text-lg font-bold text-white tracking-tight">
            Admin
          </span>
        </div>
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden text-amber-400 hover:text-amber-300 focus:outline-none"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto p-4">
        {/* General */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            General
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/admin"
                className={clsx(
                  commonLinkClasses,
                  isActiveExact("/admin")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Dashboard</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Gestión */}
        <div>
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Gestión
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/admin/empresas"
                className={clsx(
                  commonLinkClasses,
                  isActive("/admin/empresas")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Building2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Empresas</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/usuarios"
                className={clsx(
                  commonLinkClasses,
                  isActive("/admin/usuarios")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Users className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Usuarios</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/invitaciones"
                className={clsx(
                  commonLinkClasses,
                  isActive("/admin/invitaciones")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Link2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Invitaciones</span>
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
                href="/admin/productos"
                className={clsx(
                  commonLinkClasses,
                  isActive("/admin/productos")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Package className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Productos & Variedades</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dispositivos"
                className={clsx(
                  commonLinkClasses,
                  isActive("/admin/dispositivos")
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
                onClick={toggleSidebar}
              >
                <Cpu className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Dispositivos</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Sistema */}
        <div className="mt-auto">
          <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Sistema
          </span>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/select-empresa"
                className={clsx(commonLinkClasses, inactiveLinkClasses)}
                onClick={toggleSidebar}
              >
                <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>Volver a App</span>
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
