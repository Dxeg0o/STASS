"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ServicioLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const servicioId = params.servicioId as string;

  // Build breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);
  // /app/servicios/[id]/lotes/[loteId] => ["app", "servicios", id, "lotes", loteId]

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-slate-400">
        <Link href="/app" className="hover:text-white transition-colors">Inicio</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/app/servicios" className="hover:text-white transition-colors">Servicios</Link>
        {/* If we're deeper than /app/servicios/[id] */}
        {segments.length > 3 && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/app/servicios/${servicioId}`} className="hover:text-white transition-colors">
              Servicio
            </Link>
          </>
        )}
        {segments.includes("lotes") && segments.length > 4 && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/app/servicios/${servicioId}/lotes`} className="hover:text-white transition-colors">
              Lotes
            </Link>
          </>
        )}
        {segments.includes("calibres") && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Calibres</span>
          </>
        )}
      </nav>
      {children}
    </div>
  );
}
