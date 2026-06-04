"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, format } from "date-fns";
import { Check, Layers, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LoteGanttSegmented,
  type GanttRow,
} from "@/components/servicios/LoteGanttSegmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { AuthenticationContext } from "@/app/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveLote {
  id: string;
  codigoLote: string | null;
}

interface Device {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface RecentLote {
  id: string;
  codigoLote: string | null;
  totalCount: number;
  lastTs: string | null;
  variedadNombre: string | null;
  subvariedadNombre: string | null;
  productoNombre: string | null;
  createdAt: string | null;
}

interface LoteTimelineItem {
  id: string;
  codigoLote: string | null;
  variedadNombre: string | null;
  firstTs: string | null;
  lastTs: string | null;
  totalCount: number;
}

interface TimelineSession {
  sessionId: string;
  loteId: string;
  codigoLote: string | null;
  variedadNombre: string | null;
  subvariedadNombre: string | null;
  dispositivoId: string | null;
  dispositivoNombre: string | null;
  start: string;
  end: string | null; // null = en curso
}

interface SessionResolved extends TimelineSession {
  startMs: number;
  endMs: number;
  ongoing: boolean;
}

interface OverlapPair {
  a: SessionResolved;
  b: SessionResolved;
  overlapMs: number;
  sameDevice: boolean;
}

interface Lote {
  id: string;
  codigoLote?: string | null;
  fechaCreacion?: string | null;
  variedadNombre?: string | null;
  variedadTipo?: string | null;
  subvariedadNombre?: string | null;
  productoNombre?: string | null;
}

interface ServicioDetail {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  totalCount: number;
  loteCount: number;
  activeLote: ActiveLote | null;
  devices: Device[];
  recentLotes: RecentLote[];
  loteTimeline: LoteTimelineItem[];
}

interface ExportCalibreRange {
  bucket: number;
  label: string;
}

interface ExportLoteRow {
  loteId: string;
  codigoLote: string | null;
  producto: string | null;
  variedad: string | null;
  subvariedad: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  conteoTotal: number;
  desviacionEstandar: number | null;
  distribucion: Record<string, number>;
}

interface ExportResponse {
  rows: ExportLoteRow[];
  calibreRanges: ExportCalibreRange[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  planificado: {
    label: "Planificado",
    className: "border-slate-600 text-slate-400",
  },
  en_curso: {
    label: "En curso",
    className: "border-emerald-500/40 text-emerald-400",
  },
  completado: {
    label: "Completado",
    className: "border-blue-500/40 text-blue-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/40 text-red-400",
  },
};

function tipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo;
}

function displayLote(lote: { codigoLote?: string | null }): string {
  return lote.codigoLote?.trim() || "Sin código";
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ServicioDetailPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;
  const { data } = useContext(AuthenticationContext);
  const isAdmin = data?.rol_usuario === "administrador";

  const [detail, setDetail] = useState<ServicioDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [loteDialogOpen, setLoteDialogOpen] = useState(false);
  const [loteSearch, setLoteSearch] = useState("");
  const [pendingLote, setPendingLote] = useState<Lote | null>(null);
  const [changingLote, setChangingLote] = useState(false);
  const [loteActionError, setLoteActionError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Sesiones de lote (lote_session) para la línea temporal
  const [sessions, setSessions] = useState<TimelineSession[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Umbral de solapamiento considerado anómalo
  const OVERLAP_THRESHOLD_MS = 60_000; // 1 minuto

  // ── Fetch detail ─────────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    if (!servicioId) return;
    setLoadingDetail(true);
    setErrorDetail(null);
    try {
      const res = await fetch(`/api/servicios/${servicioId}/detail`);
      if (!res.ok) throw new Error("Error al cargar el servicio");
      const data: ServicioDetail = await res.json();
      setDetail(data);
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "Error al cargar el servicio");
    } finally {
      setLoadingDetail(false);
    }
  }, [servicioId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Fetch lotes for active-lote switcher ─────────────────────────────────────

  useEffect(() => {
    if (!servicioId) return;
    setLoadingLotes(true);
    fetch(`/api/lotes?servicioId=${servicioId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar lotes");
        return res.json();
      })
      .then((data: Lote[]) => setLotes(data))
      .catch((err) => {
        console.error(err);
        setLotes([]);
      })
      .finally(() => setLoadingLotes(false));
  }, [servicioId]);

  // ── Gantt timeline data ───────────────────────────────────────────────────────

  // Default the date range to the full span of processed activity
  useEffect(() => {
    if (!detail || dateRange) return;
    const timeline = detail.loteTimeline;
    if (timeline.length === 0) return;
    let min = Infinity;
    let max = -Infinity;
    timeline.forEach((l) => {
      if (l.firstTs) min = Math.min(min, new Date(l.firstTs).getTime());
      if (l.lastTs) max = Math.max(max, new Date(l.lastTs).getTime());
    });
    if (min !== Infinity && max !== -Infinity) {
      setDateRange({ from: new Date(min), to: new Date(max) });
    }
  }, [detail, dateRange]);

  // Trae las sesiones de lote cuando cambia el servicio o el rango
  useEffect(() => {
    if (!servicioId || !detail) return;
    const qs = new URLSearchParams();
    if (dateRange?.from) qs.set("from", startOfDay(dateRange.from).toISOString());
    if (dateRange?.to) qs.set("to", endOfDay(dateRange.to).toISOString());

    let cancelled = false;
    setLoadingSegments(true);
    fetch(`/api/servicios/${servicioId}/timeline?${qs.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar la línea temporal");
        return res.json();
      })
      .then((data: { sessions: TimelineSession[] }) => {
        if (!cancelled) setSessions(data.sessions ?? []);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSegments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [servicioId, detail, dateRange]);

  // Sesiones acotadas al rango visible, con start/end resueltos a epoch ms
  const visibleSessions = useMemo(() => {
    const lo = dateRange?.from ? startOfDay(dateRange.from).getTime() : -Infinity;
    const hi = dateRange?.to ? endOfDay(dateRange.to).getTime() : Infinity;
    const nowMs = Date.now();
    return sessions
      .map((s) => ({
        ...s,
        startMs: new Date(s.start).getTime(),
        endMs: s.end ? new Date(s.end).getTime() : nowMs,
        ongoing: s.end === null,
      }))
      .filter((s) => s.endMs >= lo && s.startMs <= hi);
  }, [sessions, dateRange]);

  // Detección de solapamientos > 1 min entre sesiones (anomalía)
  const { overlaps, conflictedIds } = useMemo(() => {
    const pairs: OverlapPair[] = [];
    const ids = new Set<string>();
    const arr = [...visibleSessions].sort((a, b) => a.startMs - b.startMs);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[j].startMs >= arr[i].endMs) break; // ordenadas: no habrá más traslapes con i
        const overlapMs =
          Math.min(arr[i].endMs, arr[j].endMs) - arr[j].startMs;
        if (overlapMs > OVERLAP_THRESHOLD_MS) {
          pairs.push({
            a: arr[i],
            b: arr[j],
            overlapMs,
            sameDevice: arr[i].dispositivoId === arr[j].dispositivoId,
          });
          ids.add(arr[i].sessionId);
          ids.add(arr[j].sessionId);
        }
      }
    }
    return { overlaps: pairs, conflictedIds: ids };
  }, [visibleSessions]);

  // Agrupa los traslapes por par de lotes para una alerta compacta
  const overlapGroups = useMemo(() => {
    const map = new Map<
      string,
      { a: string; b: string; count: number; maxMs: number; sameDevice: boolean; devices: Set<string> }
    >();
    for (const o of overlaps) {
      const an = o.a.codigoLote?.trim() || "Sin código";
      const bn = o.b.codigoLote?.trim() || "Sin código";
      const [x, y] = [an, bn].sort();
      const key = `${x}__${y}`;
      let g = map.get(key);
      if (!g) {
        g = { a: x, b: y, count: 0, maxMs: 0, sameDevice: false, devices: new Set() };
        map.set(key, g);
      }
      g.count++;
      g.maxMs = Math.max(g.maxMs, o.overlapMs);
      g.sameDevice = g.sameDevice || o.sameDevice;
      if (o.a.dispositivoNombre) g.devices.add(o.a.dispositivoNombre);
      if (o.b.dispositivoNombre) g.devices.add(o.b.dispositivoNombre);
    }
    return Array.from(map.values()).sort((a, b) => b.maxMs - a.maxMs);
  }, [overlaps]);

  const ganttDomain = useMemo<[number, number]>(() => {
    const from = dateRange?.from ? startOfDay(dateRange.from).getTime() : null;
    const to = dateRange?.to ? endOfDay(dateRange.to).getTime() : null;
    if (from !== null && to !== null) return [from, to];
    if (visibleSessions.length === 0) return [0, 0];
    const min = Math.min(...visibleSessions.map((s) => s.startMs));
    const max = Math.max(...visibleSessions.map((s) => s.endMs));
    return [min, max];
  }, [dateRange, visibleSessions]);

  // Filas del Gantt: una por lote, con cada sesión como un segmento
  const ganttRows = useMemo<GanttRow[]>(() => {
    const byLote = new Map<string, { nombre: string; segments: GanttRow["segments"] }>();
    for (const s of visibleSessions) {
      const nombre = s.codigoLote?.trim() || "Sin código";
      if (!byLote.has(s.loteId)) byLote.set(s.loteId, { nombre, segments: [] });
      byLote.get(s.loteId)!.segments.push({
        start: s.startMs,
        end: s.endMs,
        ongoing: s.ongoing,
        conflict: conflictedIds.has(s.sessionId),
        label: s.dispositivoNombre ?? undefined,
      });
    }
    return Array.from(byLote.entries())
      .map(([id, v]) => ({ id, nombre: v.nombre, totalCount: 0, segments: v.segments }))
      .sort((a, b) => {
        const am = Math.min(...a.segments.map((s) => s.start));
        const bm = Math.min(...b.segments.map((s) => s.start));
        return am - bm;
      });
  }, [visibleSessions, conflictedIds]);

  const filteredLotes = useMemo(() => {
    const term = loteSearch.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter((lote) =>
      [
        lote.codigoLote,
        lote.productoNombre,
        lote.variedadNombre,
        lote.variedadTipo,
        lote.subvariedadNombre,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [loteSearch, lotes]);

  const assignedDeviceCount = detail?.devices.length ?? 0;

  const resetLoteDialog = () => {
    setLoteDialogOpen(false);
    setPendingLote(null);
    setLoteSearch("");
    setLoteActionError(null);
  };

  const handleConfirmLoteChange = async () => {
    if (!pendingLote) return;
    setChangingLote(true);
    setLoteActionError(null);

    try {
      const res = await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicioId, loteId: pendingLote.id }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "No se pudo cambiar el lote activo");
      }

      await fetchDetail();
      toast.success(
        `Lote activo actualizado en ${payload?.updatedDeviceCount ?? assignedDeviceCount} dispositivos`
      );
      resetLoteDialog();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cambiar el lote activo";
      setLoteActionError(message);
      toast.error(message);
    } finally {
      setChangingLote(false);
    }
  };

  // ── Excel download ────────────────────────────────────────────────────────────

  const downloadExcel = async () => {
    try {
      const res = await fetch(`/api/servicios/${servicioId}/lotes/export`);
      if (!res.ok) throw new Error("Error al obtener resumen");

      const payload: ExportResponse = await res.json();
      const fixedHeaders = [
        "Lote",
        "Producto",
        "Variedad",
        "Subvariedad",
        "Fecha inicio",
        "Fecha término",
        "Desviación estándar",
        "Conteo total",
      ];
      const calibreHeaders = payload.calibreRanges.map((range) => range.label);
      const headers = [...fixedHeaders, ...calibreHeaders];

      const sheetData = payload.rows.map((l) => ({
        Lote: displayLote(l),
        Producto: l.producto ?? "",
        Variedad: l.variedad ?? "",
        Subvariedad: l.subvariedad ?? "",
        "Fecha inicio": l.fechaInicio
          ? format(new Date(l.fechaInicio), "yyyy-MM-dd HH:mm")
          : "",
        "Fecha término": l.fechaTermino
          ? format(new Date(l.fechaTermino), "yyyy-MM-dd HH:mm")
          : "",
        "Desviación estándar":
          l.desviacionEstandar === null
            ? ""
            : Number(l.desviacionEstandar.toFixed(3)),
        "Conteo total": l.conteoTotal,
        ...Object.fromEntries(
          payload.calibreRanges.map((range) => [
            range.label,
            l.distribucion[range.bucket.toString()] ?? 0,
          ])
        ),
      }));
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.sheet_add_json(ws, sheetData, {
        header: headers,
        skipHeader: true,
        origin: "A2",
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      XLSX.writeFile(
        wb,
        `lotes_servicio_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el Excel");
    }
  };

  // ── Excel: actividad por lote (un renglón por sesión de lote_session) ────────────

  const downloadActivityExcel = () => {
    if (visibleSessions.length === 0) {
      alert("No hay actividad para exportar en este periodo");
      return;
    }
    const headers = [
      "Lote",
      "Variedad",
      "Subvariedad",
      "Dispositivo",
      "Inicio",
      "Fin",
      "Duración (min)",
      "Solapamiento",
    ];
    const sheetData = [...visibleSessions]
      .sort((a, b) => a.startMs - b.startMs)
      .map((s) => ({
        Lote: s.codigoLote?.trim() || "Sin código",
        Variedad: s.variedadNombre ?? "",
        Subvariedad: s.subvariedadNombre ?? "",
        Dispositivo: s.dispositivoNombre ?? "",
        Inicio: format(new Date(s.startMs), "yyyy-MM-dd HH:mm"),
        Fin: s.ongoing ? "En curso" : format(new Date(s.endMs), "yyyy-MM-dd HH:mm"),
        "Duración (min)": Math.round((s.endMs - s.startMs) / 60000),
        Solapamiento: conflictedIds.has(s.sessionId) ? "SÍ" : "No",
      }));

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.sheet_add_json(ws, sheetData, {
      header: headers,
      skipHeader: true,
      origin: "A2",
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Actividad por lote");

    // Hoja extra con el detalle de los solapamientos detectados
    if (overlaps.length > 0) {
      const ovHeaders = [
        "Lote A",
        "Lote B",
        "Desde",
        "Hasta",
        "Solapamiento (min)",
        "Dispositivo",
        "Mismo dispositivo",
      ];
      const ovData = overlaps.map((o) => {
        const desde = Math.max(o.a.startMs, o.b.startMs);
        const hasta = Math.min(o.a.endMs, o.b.endMs);
        return {
          "Lote A": o.a.codigoLote?.trim() || "Sin código",
          "Lote B": o.b.codigoLote?.trim() || "Sin código",
          Desde: format(new Date(desde), "yyyy-MM-dd HH:mm"),
          Hasta: format(new Date(hasta), "yyyy-MM-dd HH:mm"),
          "Solapamiento (min)": Math.round(o.overlapMs / 60000),
          Dispositivo: o.sameDevice
            ? o.a.dispositivoNombre ?? ""
            : `${o.a.dispositivoNombre ?? "?"} / ${o.b.dispositivoNombre ?? "?"}`,
          "Mismo dispositivo": o.sameDevice ? "SÍ" : "No",
        };
      });
      const ovWs = XLSX.utils.aoa_to_sheet([ovHeaders]);
      XLSX.utils.sheet_add_json(ovWs, ovData, {
        header: ovHeaders,
        skipHeader: true,
        origin: "A2",
      });
      XLSX.utils.book_append_sheet(wb, ovWs, "Solapamientos");
    }

    XLSX.writeFile(
      wb,
      `actividad_lotes_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`
    );
  };

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Cargando servicio...
      </div>
    );
  }

  if (errorDetail || !detail) {
    return (
      <div className="text-red-400 bg-red-950/20 p-4 rounded border border-red-500/20">
        {errorDetail ?? "No se encontró el servicio."}
      </div>
    );
  }

  const devicesOnline = detail.devices.filter((d) => d.activo).length;

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {detail.nombre}
          </h1>
          <Badge
            variant="outline"
            className="border-cyan-500/40 text-cyan-400 text-sm"
          >
            {tipoLabel(detail.tipo)}
          </Badge>
          <Badge
            variant="outline"
            className={`text-sm ${ESTADO_LABELS[detail.estado]?.className ?? ESTADO_LABELS.planificado.className}`}
          >
            {ESTADO_LABELS[detail.estado]?.label ?? detail.estado}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">
          {detail.fechaInicio
            ? `Desde ${format(new Date(detail.fechaInicio), "dd/MM/yyyy")}`
            : "Sin fecha de inicio"}
          {detail.fechaFin
            ? ` — Hasta ${format(new Date(detail.fechaFin), "dd/MM/yyyy")}`
            : ` — ${ESTADO_LABELS[detail.estado]?.label ?? detail.estado}`}
        </p>
      </div>

      {/* ── Active Lote Control ── */}
      <Card className="bg-slate-900/50 border-cyan-500/20 shadow-[0_0_25px_rgba(34,211,238,0.06)]">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3">
                <Layers className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400">Lote activo</p>
                {detail.activeLote ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="truncate font-mono text-2xl font-semibold text-white">
                      {displayLote(detail.activeLote)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-lg italic text-slate-500">
                    Sin lote activo
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  El cambio aplica a {assignedDeviceCount} dispositivos asignados vigentes.
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                onClick={() => {
                  setPendingLote(null);
                  setLoteActionError(null);
                  setLoteDialogOpen(true);
                }}
                disabled={loadingLotes || lotes.length === 0 || assignedDeviceCount === 0}
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              >
                Cambiar lote
              </Button>
            )}
          </div>

          {isAdmin && assignedDeviceCount === 0 && (
            <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
              No hay dispositivos asignados vigentes para abrir una sesión de lote.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total conteo */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Total conteo</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {detail.totalCount.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        {/* Lote count */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Lotes totales</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {detail.loteCount.toLocaleString("es-CL")}
            </p>
          </CardContent>
        </Card>

        {/* Devices online */}
        <Card className="bg-slate-900/40 border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400 mb-1">Dispositivos en línea</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {devicesOnline}
              <span className="text-2xl text-slate-500">/{detail.devices.length}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={loteDialogOpen}
        onOpenChange={(open) => {
          if (changingLote) return;
          if (open) setLoteDialogOpen(true);
          else resetLoteDialog();
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {pendingLote ? "Confirmar cambio de lote" : "Cambiar lote activo"}
            </DialogTitle>
          </DialogHeader>

          {pendingLote ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Lote actual
                  </p>
                  <p className="mt-2 truncate font-mono text-lg font-semibold text-white">
                    {detail.activeLote ? displayLote(detail.activeLote) : "Sin lote activo"}
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-cyan-500">
                    Nuevo lote
                  </p>
                  <p className="mt-2 truncate font-mono text-lg font-semibold text-cyan-100">
                    {displayLote(pendingLote)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">
                Se cerrarán las sesiones abiertas actuales y se abrirá una nueva
                sesión para este lote en {assignedDeviceCount} dispositivos asignados vigentes.
              </div>

              {loteActionError && (
                <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                  {loteActionError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setPendingLote(null)}
                  disabled={changingLote}
                  className="text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleConfirmLoteChange}
                  disabled={changingLote}
                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  {changingLote ? "Cambiando..." : "Confirmar cambio"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Buscar por código, producto o variedad..."
                  value={loteSearch}
                  onChange={(e) => setLoteSearch(e.target.value)}
                  className="bg-slate-800/60 pl-10 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
                />
              </div>

              <ScrollArea className="h-80 rounded-lg border border-white/10">
                {loadingLotes ? (
                  <p className="p-4 text-sm text-slate-500">Cargando lotes...</p>
                ) : filteredLotes.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">
                    No se encontraron lotes.
                  </p>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredLotes.map((lote) => {
                      const isActive = detail.activeLote?.id === lote.id;
                      return (
                        <button
                          key={lote.id}
                          type="button"
                          disabled={isActive}
                          onClick={() => setPendingLote(lote)}
                          className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left transition ${
                            isActive
                              ? "cursor-default border border-emerald-500/30 bg-emerald-950/20"
                              : "border border-transparent hover:border-cyan-500/30 hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-mono text-sm font-semibold text-white">
                                {displayLote(lote)}
                              </p>
                              {isActive && (
                                <Badge className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300">
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[lote.productoNombre, lote.variedadTipo, lote.variedadNombre, lote.subvariedadNombre]
                                .filter(Boolean)
                                .join(" · ") || "Sin producto o variedad"}
                            </p>
                          </div>
                          {isActive && <Check className="h-4 w-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={resetLoteDialog}
                  className="text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Lote Timeline (Gantt) ── */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-white">
                Línea temporal de lotes
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Cada barra es una sesión del lote (lote_session). En un mismo
                dispositivo no debería haber solapamiento.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DatePickerWithRange value={dateRange} onChange={setDateRange} />
              <button
                onClick={downloadActivityExcel}
                disabled={loadingSegments || visibleSessions.length === 0}
                className="px-3 py-1.5 bg-slate-800/60 text-slate-300 border border-white/10 rounded-md hover:bg-slate-800 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Descargar Excel
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDetail || loadingSegments ? (
            <p className="text-center text-slate-500 py-12">Cargando datos...</p>
          ) : ganttRows.length === 0 ? (
            <p className="text-center text-slate-500 py-12">
              No hay sesiones de lote en este periodo
            </p>
          ) : (
            <div className="space-y-4">
              {overlapGroups.length > 0 && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  <p className="font-semibold">
                    ⚠ {overlapGroups.length} solapamiento{overlapGroups.length > 1 ? "s" : ""} (&gt; 1 min)
                    {overlapGroups.some((g) => g.sameDevice) && " · mismo dispositivo"}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-red-300/90">
                    {overlapGroups.slice(0, 4).map((g, i) => (
                      <li key={i}>
                        {g.a} ↔ {g.b} · hasta {Math.round(g.maxMs / 60000)} min
                        {g.count > 1 ? ` (${g.count}×)` : ""} · {[...g.devices].join(", ")}
                      </li>
                    ))}
                    {overlapGroups.length > 4 && (
                      <li>… y {overlapGroups.length - 4} más (ver Excel)</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="w-full overflow-x-auto">
                <LoteGanttSegmented rows={ganttRows} domain={ganttDomain} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Lotes Table ── */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white">
              Lotes recientes
            </CardTitle>
            <Link
              href={`/app/servicios/${servicioId}/lotes`}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Ver todos los lotes →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {detail.recentLotes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aún no hay lotes con conteos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left py-2 pr-4 font-medium">Nombre</th>
                    <th className="text-left py-2 pr-4 font-medium">Variedad</th>
                    <th className="text-right py-2 pr-4 font-medium">Conteo</th>
                    <th className="text-left py-2 pr-4 font-medium">Último conteo</th>
                    <th className="text-left py-2 font-medium">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentLotes.map((lote) => (
                    <tr
                      key={lote.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/app/servicios/${servicioId}/lotes/${lote.id}`}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                        >
                          {displayLote(lote)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {lote.variedadNombre
                          ? `${lote.productoNombre ? lote.productoNombre + " — " : ""}${lote.variedadNombre}${lote.subvariedadNombre ? " · " + lote.subvariedadNombre : ""}`
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="py-3 pr-4 text-right text-white font-semibold">
                        {lote.totalCount.toLocaleString("es-CL")}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {lote.lastTs
                          ? format(new Date(lote.lastTs), "dd/MM/yyyy HH:mm")
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="py-3 text-slate-400">
                        {lote.createdAt
                          ? format(new Date(lote.createdAt), "dd/MM/yyyy")
                          : <span className="italic text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Devices Section ── */}
      {detail.devices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Dispositivos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.devices.map((device) => (
              <Card key={device.id} className="bg-slate-900/40 border-white/10">
                <CardContent className="py-4 flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      device.activo ? "bg-emerald-400" : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {device.nombre}
                    </p>
                    <p className="text-xs text-slate-400">{device.tipo}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs flex-shrink-0 ${
                      device.activo
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-red-500/40 text-red-400"
                    }`}
                  >
                    {device.activo ? "En línea" : "Fuera de línea"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/app/servicios/${servicioId}/calibres`}
          className="px-4 py-2 bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-950/60 transition-colors text-sm font-medium hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
          Ver calibres
        </Link>
        <button
          onClick={downloadExcel}
          className="px-4 py-2 bg-slate-800/60 text-slate-300 border border-white/10 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}
