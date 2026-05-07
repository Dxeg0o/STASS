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
  isDesktopCollapsed?: boolean;
  toggleDesktopCollapse?: () => void;
}

export function AdminSidebar({
  isOpen,
  toggleSidebar,
  isDesktopCollapsed = false,
  toggleDesktopCollapse,
}: AdminSidebarProps) {
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

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const isActiveExact = (url: string) => pathname === url;

  const linkClass = (active: boolean) =>
    clsx(
      "flex items-center py-3 rounded-lg transition-all duration-200 ease-in-out text-sm font-medium tracking-wide",
      isDesktopCollapsed ? "justify-center px-3" : "space-x-3 px-4",
      active
        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    );

  const navSections = [
    {
      section: "General",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      ],
    },
    {
      section: "Gestión",
      items: [
        { href: "/admin/empresas", label: "Empresas", icon: Building2, exact: false },
        { href: "/admin/usuarios", label: "Usuarios", icon: Users, exact: false },
        { href: "/admin/invitaciones", label: "Invitaciones", icon: Link2, exact: false },
      ],
    },
    {
      section: "Operaciones",
      items: [
        { href: "/admin/productos", label: "Productos & Variedades", icon: Package, exact: false },
        { href: "/admin/dispositivos", label: "Dispositivos", icon: Cpu, exact: false },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "bg-slate-900/40 backdrop-blur-xl border-r border-white/10 text-white fixed inset-y-0 left-0 z-30 flex h-screen transform flex-col transition-all duration-300 ease-in-out md:relative md:h-full md:translate-x-0",
        isDesktopCollapsed ? "md:w-14" : "md:w-64",
        "w-64",
        {
          "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,0.5)]": isOpen,
          "-translate-x-full md:translate-x-0": !isOpen,
        }
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 bg-slate-950/20 overflow-hidden">
        {!isDesktopCollapsed ? (
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-lg font-bold text-white tracking-tight">Admin</span>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full" title="Admin">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
        )}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden text-amber-400 hover:text-amber-300 focus:outline-none shrink-0"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto p-3">
        {navSections.map(({ section, items }) => (
          <div key={section}>
            {!isDesktopCollapsed && (
              <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                {section}
              </span>
            )}
            {isDesktopCollapsed && <div className="border-t border-white/5 mb-1" />}
            <ul className="mt-2 space-y-1">
              {items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? isActiveExact(href) : isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={linkClass(active)}
                      title={isDesktopCollapsed ? label : undefined}
                      onClick={toggleSidebar}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                      {!isDesktopCollapsed && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Sistema */}
        <div className="mt-auto">
          {!isDesktopCollapsed && (
            <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Sistema
            </span>
          )}
          {isDesktopCollapsed && <div className="border-t border-white/5 mb-1" />}
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/select-empresa"
                className={linkClass(false)}
                title={isDesktopCollapsed ? "Volver a App" : undefined}
                onClick={toggleSidebar}
              >
                <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
                {!isDesktopCollapsed && <span>Volver a App</span>}
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  handleLogout();
                  if (toggleSidebar) toggleSidebar();
                }}
                className={clsx(linkClass(false), "w-full")}
                title={isDesktopCollapsed ? "Cerrar sesión" : undefined}
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
                {!isDesktopCollapsed && (
                  <span className="text-sm font-medium tracking-wide">Cerrar sesión</span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Botón de colapso desktop */}
      {toggleDesktopCollapse && (
        <button
          onClick={toggleDesktopCollapse}
          className="hidden md:flex items-center justify-center absolute -right-3 bottom-20 w-6 h-6 rounded-full bg-slate-800 border border-white/10 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white shadow-md z-10"
          aria-label={isDesktopCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          title={isDesktopCollapsed ? "Expandir" : "Colapsar"}
        >
          <ChevronLeft
            className={clsx(
              "w-3.5 h-3.5 transition-transform duration-300",
              isDesktopCollapsed && "rotate-180"
            )}
          />
        </button>
      )}
    </aside>
  );
}
