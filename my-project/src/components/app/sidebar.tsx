import { Home, Settings, Ruler } from "lucide-react";
import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BarChart2, Tag } from "lucide-react";

// Menu items.
const items = [
  {
    title: "Inicio",
    url: "/app",
    icon: Home,
  },
  {
    title: "Análisis",
    url: "/app/analisis",
    icon: BarChart2,
  },
  {
    title: "Etiquetas",
    url: "/app/etiquetas",
    icon: Tag,
  },
  {
    title: "Calibración",
    url: "/app/calibracion", // Asegúrate de que esta ruta sea correcta
    icon: Ruler, // Icono de regla para la calibración
  },
  {
    title: "Configuraciones",
    url: "/app/configuraciones",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex">
            <Image
              src="/images/Qualiblick.png"
              alt="QualiBlick"
              width={120} // Ajusta el ancho del logo
              height={120} // Ajusta la altura del logo
            />
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-8">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="mr-2" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
