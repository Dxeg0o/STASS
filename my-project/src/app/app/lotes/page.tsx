"use client";

import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------- Types ----------

interface LoteRow {
  id: string;
  codigoLote: string | null;
  createdAt: string;
  variedadNombre: string | null;
  variedadTipo: string | null;
  productoNombre: string | null;
  totalBulbs: number;
  lastTs: string | null;
  isActive: boolean;
  etapaActual: string | null;
  servicioActual: string | null;
}

interface LotesResponse {
  data: LoteRow[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Helpers ----------

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------- Main Page ----------

export default function LotesPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  const [lotes, setLotes] = useState<LoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch lotes
  const fetchLotes = useCallback(async () => {
    if (!data?.empresaId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      empresaId: data.empresaId,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/lotes/global?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar los lotes");
      const json: LotesResponse = await res.json();
      setLotes(json.data);
      setTotal(json.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [data?.empresaId, page, debouncedSearch]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estas autenticado.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Lotes</h1>
        <p className="text-slate-400 mt-1">
          {data.empresaNombre ?? ""}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por código de lote..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="p-0">
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 border-b border-white/5 animate-pulse bg-slate-900/20"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && lotes.length > 0 && (
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Variedad
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Producto
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Etapa Actual
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Bulbos
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Creado
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {lotes.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/lotes/${l.id}`}
                          className="text-slate-200 hover:text-cyan-400 transition-colors font-medium font-mono text-xs"
                        >
                          {l.codigoLote ?? l.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-400 hidden sm:table-cell">
                        {l.variedadNombre ? (
                          <span>
                            {l.variedadTipo && (
                              <span className="text-slate-600 text-xs">{l.variedadTipo} › </span>
                            )}
                            {l.variedadNombre}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 hidden md:table-cell">
                        {l.productoNombre ?? (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {l.etapaActual ? (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-950/30 text-cyan-400">
                            {l.etapaActual}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold">
                          {formatNumber(l.totalBulbs)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500 hidden md:table-cell">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {l.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">
                            Inactivo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Mostrando {(page - 1) * limit + 1}-
            {Math.min(page * limit, total)} de {total} lotes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && lotes.length === 0 && !error && (
        <div className="text-center py-20 text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No se encontraron lotes</p>
          <p className="text-sm mt-1">
            {debouncedSearch
              ? `No hay lotes que coincidan con "${debouncedSearch}".`
              : "No hay lotes registrados para esta empresa."}
          </p>
        </div>
      )}
    </div>
  );
}
