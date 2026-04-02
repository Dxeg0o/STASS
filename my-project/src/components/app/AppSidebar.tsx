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
  isDesktopCollapsed?: boolean;
  toggleDesktopCollapse?: () => void;
}

export function AppSidebar({
  isOpen,
  toggleSidebar,
  isDesktopCollapsed = false,
  toggleDesktopCollapse,
}: AppSidebarProps) {
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

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const isActiveExact = (url: string) => pathname === url;

  const linkClass = (active: boolean) =>
    clsx(
      "flex items-center py-3 rounded-lg transition-all duration-200 ease-in-out text-sm font-medium tracking-wide",
      isDesktopCollapsed
        ? "justify-center px-3"
        : "space-x-3 px-4",
      active
        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    );

  const navItems = [
    {
      section: "Overview",
      items: [
        { href: "/app", label: "Inicio", icon: Home, exact: true },
      ],
    },
    {
      section: "Operaciones",
      items: [
        { href: "/app/procesos", label: "Procesos", icon: ClipboardList, exact: false },
        { href: "/app/lotes", label: "Lotes", icon: Package, exact: false },
      ],
    },
    {
      section: "Inteligencia",
      items: [
        { href: "/app/analitica", label: "Analítica", icon: BarChart3, exact: false },
        { href: "/app/control", label: "Control Operacional", icon: Gauge, exact: false },
      ],
    },
    {
      section: "Ajustes",
      items: [
        { href: "/app/configuraciones", label: "Configuraciones", icon: Settings, exact: false },
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
        {!isDesktopCollapsed && (
          <Link
            href="/app"
            className="text-xl font-bold text-white tracking-tight truncate"
          >
            Qualiblick
          </Link>
        )}
        {isDesktopCollapsed && (
          <Link
            href="/app"
            className="flex items-center justify-center w-full"
            title="Qualiblick"
          >
            <Home className="h-5 w-5 text-cyan-400" strokeWidth={2} />
          </Link>
        )}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden text-cyan-400 hover:text-cyan-300 focus:outline-none shrink-0"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col space-y-6 overflow-y-auto p-3">
        {navItems.map(({ section, items }) => (
          <div key={section}>
            {!isDesktopCollapsed && (
              <span className="px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                {section}
              </span>
            )}
            {isDesktopCollapsed && (
              <div className="border-t border-white/5 mb-1" />
            )}
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
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={active ? 2.5 : 2}
                      />
                      {!isDesktopCollapsed && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div ref={userMenuRef} className="relative border-t border-white/10">
        {/* Dropdown menu */}
        {userMenuOpen && (
          <div
            className={clsx(
              "absolute bottom-full mb-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden",
              isDesktopCollapsed ? "left-14 bottom-0 mb-0" : "left-3 right-3"
            )}
          >
            <Link
              href="/app/perfil"
              onClick={() => {
                setUserMenuOpen(false);
                if (toggleSidebar) toggleSidebar();
              }}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
            >
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Configuraciones de usuario</span>
            </Link>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                handleLogout();
                if (toggleSidebar) toggleSidebar();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Botón de usuario */}
        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className={clsx(
            "flex items-center w-full hover:bg-white/5 transition-colors group",
            isDesktopCollapsed ? "justify-center px-3 py-4" : "gap-3 px-4 py-4"
          )}
          title={isDesktopCollapsed ? data?.name ?? "Usuario" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-cyan-400">
              {data?.name?.charAt(0).toUpperCase() ?? "U"}
            </span>
          </div>
          {!isDesktopCollapsed && (
            <>
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
            </>
          )}
        </button>
      </div>

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
