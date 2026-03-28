"use client";

import { Menu, X, Shield } from "lucide-react";

interface AdminNavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function AdminNavbar({ isSidebarOpen, toggleSidebar }: AdminNavbarProps) {
  return (
    <nav className="bg-slate-950/80 backdrop-blur-md border-b border-white/10 text-white fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="md:hidden text-amber-400 hover:text-amber-300 focus:outline-none transition-colors"
            aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-bold tracking-tight">
              Qualiblick <span className="text-amber-400">Admin</span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
