"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, ClipboardList, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface AdminStats {
  totalEmpresas: number;
  totalUsuarios: number;
  procesosActivos: number;
  totalConteos: number;
}

const statCards = [
  {
    key: "totalEmpresas" as const,
    label: "Total Empresas",
    icon: Building2,
    accent: true,
  },
  {
    key: "totalUsuarios" as const,
    label: "Total Usuarios",
    icon: Users,
    accent: false,
  },
  {
    key: "procesosActivos" as const,
    label: "Procesos Activos",
    icon: ClipboardList,
    accent: false,
  },
  {
    key: "totalConteos" as const,
    label: "Total Conteos",
    icon: BarChart3,
    accent: false,
  },
];

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/admin/stats");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Panel de Administraci&oacute;n
        </h1>
        <p className="text-slate-400 mt-1">
          Bienvenido al panel de administraci&oacute;n de Qualiblick. Aqu&iacute; puedes
          gestionar empresas, usuarios, productos y dispositivos.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="bg-slate-900/60 border-white/10"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-10 bg-slate-800 rounded-lg animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))
          : statCards.map((card, index) => {
              const Icon = card.icon;
              const value = stats?.[card.key] ?? 0;
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-slate-900/60 border-white/10 hover:border-amber-500/30 transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                            {card.label}
                          </p>
                          <p
                            className={`text-3xl font-bold mt-2 ${
                              card.accent ? "text-amber-400" : "text-white"
                            }`}
                          >
                            {formatNumber(value)}
                          </p>
                        </div>
                        <div
                          className={`p-2.5 rounded-lg ${
                            card.accent
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : "bg-slate-800/60 border border-white/10"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              card.accent ? "text-amber-400" : "text-slate-400"
                            }`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Welcome Section */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Qualiblick Admin
                </h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                Desde este panel puedes administrar todas las entidades del sistema.
                Usa la barra lateral para navegar entre las secciones de empresas,
                usuarios, productos y dispositivos. Cada secci&oacute;n te permite crear,
                editar y gestionar los registros correspondientes.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
