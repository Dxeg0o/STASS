"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import AuthContext from "../context/AuthContext";
import AdminProtectedRoute from "./AdminProtectedRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar:adminDesktopCollapsed");
    if (saved === "true") setIsDesktopCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDesktopCollapse = () => {
    const next = !isDesktopCollapsed;
    setIsDesktopCollapsed(next);
    localStorage.setItem("sidebar:adminDesktopCollapsed", String(next));
  };

  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AuthContext>
      <AdminProtectedRoute>
        <div className="flex h-screen flex-col bg-slate-950 text-white relative overflow-hidden">
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-amber-500/10 rounded-[100%] blur-[100px] opacity-20 pointer-events-none z-0" />

          <div className="relative z-20">
            <AdminNavbar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
            />
          </div>

          <div className="flex flex-1 pt-16 relative z-10 min-h-0">
            <AdminSidebar
              isOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              isDesktopCollapsed={isDesktopCollapsed}
              toggleDesktopCollapse={toggleDesktopCollapse}
            />

            {isSidebarOpen && (
              <div
                onClick={toggleSidebar}
                className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
                aria-hidden="true"
              />
            )}

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </AdminProtectedRoute>
    </AuthContext>
  );
}
