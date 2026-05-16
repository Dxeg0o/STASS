import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: "cyan" | "emerald" | "orange" | "indigo";
  hint?: string;
}

const ACCENTS = {
  cyan: { icon: "text-cyan-400", value: "text-cyan-300" },
  emerald: { icon: "text-emerald-400", value: "text-emerald-300" },
  orange: { icon: "text-orange-400", value: "text-orange-300" },
  indigo: { icon: "text-indigo-400", value: "text-indigo-300" },
};

export function KpiCard({ icon: Icon, label, value, accent = "cyan", hint }: KpiCardProps) {
  const styles = ACCENTS[accent];
  return (
    <Card className="bg-slate-900/40 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${styles.icon}`} />
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        </div>
        <p className={`text-2xl font-bold ${styles.value} font-mono`}>{value}</p>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
