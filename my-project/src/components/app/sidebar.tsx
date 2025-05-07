import { Home, Settings, ChartSpline } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

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

// Menu items with separated groups
const mainItems = [
  {
    title: "Inicio",
    url: "/app",
    icon: Home,
  },
  {
    title: "Datos",
    url: "/app/datos",
    icon: ChartSpline,
  },
];

const secondaryItems = [
  {
    title: "Configuraciones",
    url: "/app/configuraciones",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-neutral-100 bg-white shadow-sm">
      <SidebarContent>
        {/* Logo Section */}
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

        {/* Main Navigation */}
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

        {/* Secondary Navigation */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
