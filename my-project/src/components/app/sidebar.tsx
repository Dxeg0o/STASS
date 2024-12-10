import { Home, Settings } from "lucide-react";
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
              src="/images/Stass completo.png"
              alt="STASS"
              width={120} // Reducir aún más el ancho para asegurar que el logo no exceda el espacio
              height={120} // Reducir la altura para mantener la proporción
            />
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-8">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
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
