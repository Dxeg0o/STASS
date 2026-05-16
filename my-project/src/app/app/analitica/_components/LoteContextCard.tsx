import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, Activity, Calendar, Sprout } from "lucide-react";
import {
  formatDateShort,
  formatNumber,
  relativeTimeEs,
  type LoteOption,
} from "./types";

export function LoteContextCard({ lote }: { lote: LoteOption }) {
  const code = lote.codigoLote?.trim() || "Sin código";
  const hasData = lote.totalBulbs > 0 || !!lote.lastTs;

  return (
    <Card className="bg-gradient-to-br from-slate-900/60 to-slate-900/30 border-white/10">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-semibold text-white tracking-tight">
                {code}
              </span>
              {lote.isActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">
                  Activo
                </Badge>
              ) : (
                <Badge className="bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/40">
                  Inactivo
                </Badge>
              )}
              {!hasData && (
                <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/15">
                  Sin datos
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-400 flex items-center gap-2 flex-wrap">
              <Sprout className="w-3.5 h-3.5 text-slate-500" />
              <span>{lote.variedadNombre ?? "Sin variedad"}</span>
              {lote.productoNombre && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">{lote.productoNombre}</span>
                </>
              )}
              {lote.variedadTipo && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 border-white/10 text-slate-400"
                >
                  {lote.variedadTipo}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Metric icon={Layers} label="Etapa actual" value={lote.etapaActual ?? "—"} sub={lote.servicioActual ?? undefined} />
            <Metric icon={Package} label="Total bulbos" value={formatNumber(lote.totalBulbs)} />
            <Metric
              icon={Activity}
              label="Última actividad"
              value={relativeTimeEs(lote.lastTs)}
              sub={lote.lastTs ? formatDateShort(lote.lastTs) : undefined}
            />
            <Metric
              icon={Calendar}
              label="Creado"
              value={formatDateShort(lote.createdAt)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="mt-0.5 text-sm text-white font-medium">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
