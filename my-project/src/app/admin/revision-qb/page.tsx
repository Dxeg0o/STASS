"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Servicio = {
  id: string;
  nombre: string;
  modoCalibre: "medido" | "declarado";
};

type Lote = { id: string; codigoLote?: string | null };

type Discrepancia = {
  lote_id: string;
  dispositivo_id: string;
  tramo_id: string;
  calibre_from: number | null;
  calibre_to: number | null;
  total: number;
  dentro_de_rango: number;
  bajo: number;
  sobre: number;
  porcentaje_dentro: number;
};

type RevisionResponse = {
  items: Discrepancia[];
  resumen: {
    total: number;
    dentro_de_rango: number;
    porcentaje_dentro: number;
  };
};

function rangeLabel(from: number | null, to: number | null) {
  if (from === null && to !== null) return `<${to} cm`;
  if (from !== null && to === null) return `>${from} cm`;
  if (from !== null && to !== null) return `${from}-${to} cm`;
  return "Sin rango";
}

export default function RevisionQbPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [servicioId, setServicioId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [revision, setRevision] = useState<RevisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/servicios")
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los servicios");
        return (await res.json()) as Servicio[];
      })
      .then((items) => setServicios(items))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoteId("");
    setLotes([]);
    if (!servicioId) return;

    fetch(`/api/lotes?servicioId=${servicioId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los lotes");
        return (await res.json()) as Lote[];
      })
      .then(setLotes)
      .catch((err: Error) => setError(err.message));
  }, [servicioId]);

  useEffect(() => {
    setRevision(null);
    if (!servicioId) return;

    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ servicioId });
    if (loteId) params.set("loteId", loteId);

    fetch(`/api/internal/calibres/discrepancia?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar la revisión QB");
        return (await res.json()) as RevisionResponse;
      })
      .then(setRevision)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [servicioId, loteId]);

  const servicio = useMemo(
    () => servicios.find((item) => item.id === servicioId),
    [servicios, servicioId]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Revisión QB</h1>
        <p className="mt-1 text-slate-400">
          Control interno entre el calibre medido por QualiBlick y el declarado por salida.
        </p>
      </div>

      <Card className="border-white/10 bg-slate-900/40">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-slate-300">
            Servicio
            <select
              value={servicioId}
              onChange={(event) => setServicioId(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">Selecciona un servicio</option>
              {servicios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} · {item.modoCalibre}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-slate-300">
            Lote (opcional)
            <select
              value={loteId}
              onChange={(event) => setLoteId(event.target.value)}
              disabled={!servicioId}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="">Todos los lotes</option>
              {lotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigoLote?.trim() || item.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {servicio && servicio.modoCalibre !== "declarado" && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Este servicio está en modo medido. La revisión solo tendrá filas cuando existan tramos declarados por salida.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {revision && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-white/10 bg-slate-900/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Unidades evaluadas</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold text-white">{revision.resumen.total.toLocaleString("es-CL")}</CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-900/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Dentro de rango</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold text-emerald-300">{revision.resumen.dentro_de_rango.toLocaleString("es-CL")}</CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-900/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Coincidencia QB</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold text-cyan-300">{revision.resumen.porcentaje_dentro.toFixed(2)}%</CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-slate-900/40">
            <CardHeader><CardTitle className="text-white">Detalle por salida y tramo</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-slate-400">Cargando…</p> : revision.items.length === 0 ? (
                <p className="text-sm text-slate-400">No hay tramos declarados con mediciones para esta selección.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-slate-400">
                      <tr><th className="px-3 py-2">Rango declarado</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Dentro</th><th className="px-3 py-2">Bajo</th><th className="px-3 py-2">Sobre</th><th className="px-3 py-2">Coincidencia</th></tr>
                    </thead>
                    <tbody>
                      {revision.items.map((item) => (
                        <tr key={item.tramo_id} className="border-b border-white/5 text-slate-200">
                          <td className="px-3 py-3"><Badge variant="outline" className="border-amber-500/40 text-amber-200">{rangeLabel(item.calibre_from, item.calibre_to)}</Badge></td>
                          <td className="px-3 py-3">{item.total.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-3 text-emerald-300">{item.dentro_de_rango.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-3">{item.bajo.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-3">{item.sobre.toLocaleString("es-CL")}</td>
                          <td className="px-3 py-3">{item.porcentaje_dentro.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
