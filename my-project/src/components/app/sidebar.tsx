"use client";

import axios from "axios";
import { deleteCookie } from "cookies-next/client";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { Home, Settings, Archive, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { AuthenticationContext } from "../../app/context/AuthContext";

// Menú principal
const mainItems = [
  { title: "Inicio", url: "/app", icon: Home },
  { title: "Lotes", url: "/app/lotes", icon: Archive },
];

// Menú secundario (antes de logout)
const secondaryItems = [
  { title: "Configuraciones", url: "/app/configuraciones", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setAuthState } = useContext(AuthenticationContext);

  const handleLogout = () => {
    // 1. Borrar la cookie del token
    deleteCookie("token");
    // 2. Limpiar el header de axios
    delete axios.defaults.headers.common["Authorization"];
    // 3. Resetear el estado de auth
    setAuthState?.({ data: null, error: null, loading: false });
    // 4. Redirigir al login
    router.push("/login");
  };
  return (
    <Sidebar className="border-r border-neutral-100 bg-white shadow-sm">
      <SidebarContent>
        {/* Logo */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex h-20 items-center px-6">
            <Image
              src="/images/Qualiblick.png"
              alt="QualiBlick"
              width={130}
              height={40}
              priority
              className="transition-opacity hover:opacity-80"
            />
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* Navegación principal */}
        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={clsx(
                      "mx-4 rounded-lg px-4 py-3 transition-all",
                      pathname === item.url
                        ? "bg-primary-50 text-primary-600 [&_svg]:text-primary-500"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <Link href={item.url} className="group flex items-center">
                      <item.icon
                        className="mr-3 h-5 w-5 shrink-0"
                        strokeWidth={pathname === item.url ? 2 : 1.75}
                      />
                      <span className="text-sm font-medium tracking-wide">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navegación secundaria + logout */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={clsx(
                      "mx-4 rounded-lg px-4 py-3 transition-all",
                      pathname === item.url
                        ? "bg-primary-50 text-primary-600 [&_svg]:text-primary-500"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <Link href={item.url} className="group flex items-center">
                      <item.icon
                        className="mr-3 h-5 w-5 shrink-0"
                        strokeWidth={pathname === item.url ? 2 : 1.75}
                      />
                      <span className="text-sm font-medium tracking-wide">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Item de Cerrar sesión */}
              <SidebarMenuItem key="logout">
                <SidebarMenuButton
                  asChild
                  onClick={handleLogout}
                  className="mx-4 rounded-lg px-4 py-3 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                >
                  <button className="group flex items-center w-full">
                    <LogOut
                      className="mr-3 h-5 w-5 shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="text-sm font-medium tracking-wide">
                      Cerrar sesión
                    </span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
