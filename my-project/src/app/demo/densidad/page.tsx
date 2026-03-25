"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { PlantingRow } from "@/components/app/density/DensityMap";

const DensityMap = dynamic(
  () => import("@/components/app/density/DensityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[650px] w-full rounded-xl bg-slate-900/50 ring-1 ring-white/[0.06] animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 tracking-wide">
            Cargando mapa satelital…
          </span>
        </div>
      </div>
    ),
  }
);

// ── Field config ─────────────────────────────────────────────────────
// Campo Valdivia Lilies, Pelchuquín, Los Ríos, Chile
const FIELD_CENTER: [number, number] = [-39.6348126, -73.0801113];

type LocalPoint = {
  east: number;
  north: number;
};

const METERS_PER_DEGREE_LAT = 111_320;
const METERS_PER_DEGREE_LNG =
  Math.cos((FIELD_CENTER[0] * Math.PI) / 180) * METERS_PER_DEGREE_LAT;
const ROW_WIDTH_METERS = 1.8;
const ROW_GAP_METERS = 1;
const ROW_PITCH_METERS = ROW_WIDTH_METERS + ROW_GAP_METERS;

const FIELD_BOUNDARY: [number, number][] = [
  [-39.63239264027593, -73.0768007040024],
  [-39.63304127037611, -73.07584583759309],
  [-39.63366097498189, -73.0764949321747],
  [-39.63414640637884, -73.07680606842042],
  [-39.63487351426886, -73.07725667953493],
  [-39.63584848785335, -73.0775034427643],
  [-39.63627193608315, -73.07842075824739],
  [-39.63595073534625, -73.07843148708345],
  [-39.63576379789632, -73.07911276817323],
  [-39.63625954251325, -73.0794131755829],
  [-39.636590036950636, -73.07978332042696],
  [-39.63702793964783, -73.07927906513216],
  [-39.637102300207836, -73.07957947254182],
  [-39.636280198461854, -73.08203101158144],
  [-39.63575553545594, -73.0829429626465],
  [-39.63449550174579, -73.08397829532625],
  [-39.63371055111052, -73.08390319347383],
  [-39.634301330575695, -73.0816286802292],
  [-39.63420217912968, -73.08102786540987],
  [-39.633991481835025, -73.081231713295],
  [-39.6336072674691, -73.0793058872223],
  [-39.63314868623885, -73.07766973972322],
];

type AxisPoint = {
  along: number;
  across: number;
};

type FieldSector = {
  polygon: LocalPoint[];
  direction: LocalPoint;
  densityBias: number;
  segmentLength: number;
  minIntervalLength: number;
};

// The field is split into two clean, non-overlapping sectors that share
// a single internal boundary. Each sector is then filled by sweeping
// parallel rows across its polygon.
const MAIN_SECTOR: LocalPoint[] = [
  { east: 230.9, north: -77.7 },
  { east: 223.6, north: -115.3 },
  { east: 144.9, north: -162.5 },
  { east: 144.0, north: -126.7 },
  { east: 85.6, north: -105.9 },
  { east: 59.9, north: -161.1 },
  { east: 28.1, north: -197.9 },
  { east: 71.3, north: -246.6 },
  { east: 45.6, north: -254.9 },
  { east: -164.6, north: -163.4 },
  { east: -242.8, north: -105.0 },
  { east: -331.5, north: 35.3 },
  { east: -325.1, north: 122.7 },
  { east: -130.1, north: 56.9 },
  { east: -78.6, north: 68.0 },
  { east: -96.1, north: 91.4 },
  { east: 69.0, north: 134.2 },
  { east: 73.2, north: 135.7 },
];

const UPPER_SECTOR: LocalPoint[] = [
  { east: 283.8, north: 269.4 },
  { east: 365.7, north: 197.2 },
  { east: 310.0, north: 128.2 },
  { east: 283.4, north: 74.2 },
  { east: 244.7, north: -6.8 },
  { east: 230.9, north: -77.7 },
  { east: 73.2, north: 135.7 },
  { east: 209.3, north: 185.2 },
];

const FIELD_SECTORS: FieldSector[] = [
  {
    polygon: MAIN_SECTOR,
    direction: normalizePoint({ east: 0.821, north: -0.57 }),
    densityBias: 0.15,
    segmentLength: 10,
    minIntervalLength: 10,
  },
  {
    polygon: UPPER_SECTOR,
    direction: normalizePoint({ east: 0.642, north: 0.767 }),
    densityBias: -0.1,
    segmentLength: 9,
    minIntervalLength: 8,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addPoints(a: LocalPoint, b: LocalPoint): LocalPoint {
  return { east: a.east + b.east, north: a.north + b.north };
}

function scalePoint(point: LocalPoint, factor: number): LocalPoint {
  return { east: point.east * factor, north: point.north * factor };
}

function dotPoints(a: LocalPoint, b: LocalPoint) {
  return a.east * b.east + a.north * b.north;
}

function magnitude(point: LocalPoint) {
  return Math.hypot(point.east, point.north);
}

function normalizePoint(point: LocalPoint): LocalPoint {
  const length = magnitude(point) || 1;
  return {
    east: point.east / length,
    north: point.north / length,
  };
}

function toLocal(point: [number, number]): LocalPoint {
  return {
    north: (point[0] - FIELD_CENTER[0]) * METERS_PER_DEGREE_LAT,
    east: (point[1] - FIELD_CENTER[1]) * METERS_PER_DEGREE_LNG,
  };
}

function toLatLng(point: LocalPoint): [number, number] {
  return [
    FIELD_CENTER[0] + point.north / METERS_PER_DEGREE_LAT,
    FIELD_CENTER[1] + point.east / METERS_PER_DEGREE_LNG,
  ];
}

function toAxisPoint(
  point: LocalPoint,
  direction: LocalPoint,
  normal: LocalPoint
): AxisPoint {
  return {
    along: dotPoints(point, direction),
    across: dotPoints(point, normal),
  };
}

function getSegmentLengthMeters(
  start: [number, number],
  end: [number, number]
) {
  const north = (end[0] - start[0]) * METERS_PER_DEGREE_LAT;
  const east = (end[1] - start[1]) * METERS_PER_DEGREE_LNG;
  return Math.hypot(east, north);
}

function fromAxisPoint(
  axisPoint: AxisPoint,
  direction: LocalPoint,
  normal: LocalPoint
): LocalPoint {
  return addPoints(
    scalePoint(direction, axisPoint.along),
    scalePoint(normal, axisPoint.across)
  );
}

function getAcrossPositions(axisPolygon: AxisPoint[]) {
  const acrossValues = axisPolygon.map((point) => point.across);
  const minAcross = Math.min(...acrossValues);
  const maxAcross = Math.max(...acrossValues);
  const width = maxAcross - minAcross;
  const rowCount = Math.max(1, Math.floor(width / ROW_PITCH_METERS) + 1);
  const usedWidth = (rowCount - 1) * ROW_PITCH_METERS;
  const startAcross = minAcross + (width - usedWidth) * 0.5;

  return Array.from({ length: rowCount }, (_, index) =>
    startAcross + index * ROW_PITCH_METERS
  );
}

function getIntervalsForAcross(
  axisPolygon: AxisPoint[],
  across: number,
  minIntervalLength: number
) {
  const intersections: number[] = [];

  for (let i = 0; i < axisPolygon.length; i++) {
    const start = axisPolygon[i];
    const end = axisPolygon[(i + 1) % axisPolygon.length];

    if (start.across === end.across) {
      continue;
    }

    const minAcross = Math.min(start.across, end.across);
    const maxAcross = Math.max(start.across, end.across);

    if (across < minAcross || across >= maxAcross) {
      continue;
    }

    const t = (across - start.across) / (end.across - start.across);
    intersections.push(start.along + (end.along - start.along) * t);
  }

  intersections.sort((a, b) => a - b);

  const intervals: [number, number][] = [];
  for (let i = 0; i < intersections.length - 1; i += 2) {
    const interval: [number, number] = [intersections[i], intersections[i + 1]];
    if (interval[1] - interval[0] >= minIntervalLength) {
      intervals.push(interval);
    }
  }

  return intervals;
}

function getSegmentDensity(
  midpoint: LocalPoint,
  sectorIndex: number,
  rowIndex: number,
  rowCount: number,
  progress: number
) {
  const lateralRatio = rowCount <= 1 ? 0.5 : rowIndex / (rowCount - 1);
  let density =
    7.2 +
    FIELD_SECTORS[sectorIndex].densityBias +
    Math.sin(progress * Math.PI * 2.2 + sectorIndex * 0.9) * 0.8 +
    Math.cos(lateralRatio * Math.PI * 1.7 - progress * 1.1) * 0.5 +
    Math.sin((midpoint.east - midpoint.north) / 82) * 0.35;

  return Math.round(clamp(density, 3, 11.5) * 10) / 10;
}

// ── Generate realistic planting rows ──────────────────────────────────
function generatePlantingRows(): PlantingRow[] {
  const rows: PlantingRow[] = [];
  let rowId = 1;

  FIELD_SECTORS.forEach((sector, sectorIndex) => {
    const normal = {
      east: -sector.direction.north,
      north: sector.direction.east,
    };
    const axisPolygon = sector.polygon.map((point) =>
      toAxisPoint(point, sector.direction, normal)
    );
    const acrossPositions = getAcrossPositions(axisPolygon);

    acrossPositions.forEach((across, rowIndex) => {
      const intervals = getIntervalsForAcross(
        axisPolygon,
        across,
        sector.minIntervalLength
      );

      intervals.forEach((interval) => {
        const intervalLength = interval[1] - interval[0];
        const segments: PlantingRow["segments"] = [];

        for (
          let along = interval[0];
          along < interval[1] - 1e-6;
          along += sector.segmentLength
        ) {
          const nextAlong = Math.min(along + sector.segmentLength, interval[1]);
          const start = fromAxisPoint(
            { along, across },
            sector.direction,
            normal
          );
          const end = fromAxisPoint(
            { along: nextAlong, across },
            sector.direction,
            normal
          );
          const midpoint = fromAxisPoint(
            { along: (along + nextAlong) * 0.5, across },
            sector.direction,
            normal
          );
          const progress =
            ((along + nextAlong) * 0.5 - interval[0]) / intervalLength;

          segments.push({
            start: toLatLng(start),
            end: toLatLng(end),
            density: getSegmentDensity(
              midpoint,
              sectorIndex,
              rowIndex,
              acrossPositions.length,
              progress
            ),
          });
        }

        if (segments.length > 0) {
          rows.push({
            id: rowId++,
            segments,
          });
        }
      });
    });
  });

  return rows;
}

function getPlantingBoundary(): [number, number][] {
  return FIELD_BOUNDARY;
}

// ── Density classification ────────────────────────────────────────────
type DensityClass = "sparse" | "low" | "optimal" | "high" | "excess";
type EditorMode = "none" | "boundary" | "rows";

function classifyDensity(d: number): DensityClass {
  if (d < 3) return "sparse";
  if (d < 5) return "low";
  if (d < 8) return "optimal";
  if (d < 11) return "high";
  return "excess";
}

const CLASS_CONFIG: Record<
  DensityClass,
  { label: string; color: string; tagBg: string; tagText: string }
> = {
  sparse: {
    label: "Escasa",
    color: "#3b82f6",
    tagBg: "bg-blue-500/10",
    tagText: "text-blue-400",
  },
  low: {
    label: "Baja",
    color: "#22d3ee",
    tagBg: "bg-cyan-500/10",
    tagText: "text-cyan-400",
  },
  optimal: {
    label: "Óptima",
    color: "#22c55e",
    tagBg: "bg-emerald-500/10",
    tagText: "text-emerald-400",
  },
  high: {
    label: "Alta",
    color: "#f59e0b",
    tagBg: "bg-amber-500/10",
    tagText: "text-amber-400",
  },
  excess: {
    label: "Excesiva",
    color: "#ef4444",
    tagBg: "bg-red-500/10",
    tagText: "text-red-400",
  },
};

// ── Page ──────────────────────────────────────────────────────────────
export default function DemoDensidadPage() {
  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("none");
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>(
    () => getPlantingBoundary()
  );
  const [draftRowStart, setDraftRowStart] = useState<[number, number] | null>(
    null
  );
  const [copiedHardcode, setCopiedHardcode] = useState(false);
  const [showDensityLines, setShowDensityLines] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [densityFilter, setDensityFilter] = useState<DensityClass | "all">(
    "all"
  );

  useEffect(() => {
    setRows(generatePlantingRows());
  }, []);

  // Stats
  const stats = useMemo(() => {
    if (rows.length === 0)
      return {
        totalBulbs: 0,
        avgDensity: 0,
        variance: 0,
        minDensity: 0,
        maxDensity: 0,
        rowCount: 0,
        classCounts: {
          sparse: 0,
          low: 0,
          optimal: 0,
          high: 0,
          excess: 0,
        } as Record<DensityClass, number>,
        alerts: 0,
      };

    const allDensities = rows.flatMap((r) => r.segments.map((s) => s.density));
    const classCounts: Record<DensityClass, number> = {
      sparse: 0,
      low: 0,
      optimal: 0,
      high: 0,
      excess: 0,
    };
    let totalBulbs = 0;
    const densitySum = allDensities.reduce((a, b) => a + b, 0);
    const avgDensity = densitySum / allDensities.length;
    const variance =
      allDensities.reduce((acc, density) => {
        const delta = density - avgDensity;
        return acc + delta * delta;
      }, 0) / allDensities.length;

    for (const row of rows) {
      for (const seg of row.segments) {
        classCounts[classifyDensity(seg.density)]++;
        totalBulbs += seg.density * getSegmentLengthMeters(seg.start, seg.end);
      }
    }

    return {
      totalBulbs: Math.round(totalBulbs),
      avgDensity,
      variance,
      minDensity: Math.min(...allDensities),
      maxDensity: Math.max(...allDensities),
      rowCount: rows.length,
      classCounts,
      alerts: classCounts.sparse + classCounts.excess,
    };
  }, [rows]);

  // Filter visible rows by density class
  const visibleRows = useMemo(() => {
    if (densityFilter === "all") return undefined;
    const set = new Set<number>();
    for (const row of rows) {
      if (row.segments.some((s) => classifyDensity(s.density) === densityFilter)) {
        set.add(row.id);
      }
    }
    return set;
  }, [rows, densityFilter]);

  // Selected row details
  const selectedRowData = useMemo(() => {
    if (selectedRow === null) return null;
    return rows.find((r) => r.id === selectedRow) ?? null;
  }, [rows, selectedRow]);

  const plantingBoundary = useMemo(
    () => (boundaryPoints.length >= 3 ? boundaryPoints : undefined),
    [boundaryPoints]
  );

  const selectedRowStats = useMemo(() => {
    if (!selectedRowData) return null;
    const densities = selectedRowData.segments.map((s) => s.density);
    return {
      avg: densities.reduce((a, b) => a + b, 0) / densities.length,
      min: Math.min(...densities),
      max: Math.max(...densities),
      bulbs: Math.round(
        selectedRowData.segments.reduce(
          (acc, segment) =>
            acc +
            segment.density * getSegmentLengthMeters(segment.start, segment.end),
          0
        )
      ),
    };
  }, [selectedRowData]);

  const hardcodedGeometry = useMemo(
    () =>
      [
        `const FIELD_CENTER: [number, number] = [${FIELD_CENTER[0]}, ${FIELD_CENTER[1]}];`,
        `const FIELD_BOUNDARY: [number, number][] = ${JSON.stringify(
          boundaryPoints,
          null,
          2
        )};`,
        `const HARD_CODED_ROWS: PlantingRow[] = ${JSON.stringify(rows, null, 2)};`,
      ].join("\n\n"),
    [boundaryPoints, rows]
  );

  const handleMapClick = (point: [number, number]) => {
    if (editorMode === "boundary") {
      setBoundaryPoints((prev) => [...prev, point]);
      return;
    }

    if (editorMode !== "rows") return;

    if (!draftRowStart) {
      setDraftRowStart(point);
      return;
    }

    const defaultDensity = Number((stats.avgDensity || 7.5).toFixed(1));
    setRows((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        segments: [
          {
            start: draftRowStart,
            end: point,
            density: defaultDensity,
          },
        ],
      },
    ]);
    setDraftRowStart(null);
  };

  const handleUndo = () => {
    if (editorMode === "boundary") {
      setBoundaryPoints((prev) => prev.slice(0, -1));
      return;
    }

    if (editorMode === "rows") {
      if (draftRowStart) {
        setDraftRowStart(null);
        return;
      }

      setRows((prev) =>
        prev.slice(0, -1).map((row, index) => ({ ...row, id: index + 1 }))
      );
    }
  };

  const copyHardcode = async () => {
    await navigator.clipboard.writeText(hardcodedGeometry);
    setCopiedHardcode(true);
    window.setTimeout(() => setCopiedHardcode(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500/30">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#020617"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              AgroBulbs
            </span>
            <span className="text-slate-600 text-sm">/</span>
            <span className="text-sm text-slate-400">Densidad</span>
          </div>
          <span className="text-[11px] font-medium tracking-widest uppercase text-slate-600 border border-white/[0.06] rounded-full px-3 py-1">
            Demo
          </span>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight">
              Mapa de Densidad
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Valdivia Lilies · Pelchuquín, Los Ríos — {stats.rowCount} hileras ·{" "}
              {stats.totalBulbs.toLocaleString("es-CL")} bulbos estimados
            </p>
          </div>
          {stats.alerts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-medium">
                {stats.alerts} segmentos requieren atención
              </span>
            </div>
          )}
        </div>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {(
            [
              ["Hileras", stats.rowCount.toString(), null],
              [
                "Densidad media",
                `${stats.avgDensity.toFixed(1)}`,
                "bulbos/m",
              ],
              ["Varianza", `${stats.variance.toFixed(2)}`, "campo"],
              ["Mín.", `${stats.minDensity.toFixed(1)}`, "bulbos/m"],
              ["Máx.", `${stats.maxDensity.toFixed(1)}`, "bulbos/m"],
              [
                "Total bulbos",
                stats.totalBulbs.toLocaleString("es-CL"),
                "estimado",
              ],
            ] as [string, string, string | null][]
          ).map(([label, value, unit]) => (
            <div
              key={label}
              className="bg-slate-900/40 rounded-xl border border-white/[0.04] px-4 py-3"
            >
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                {label}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-white tabular-nums">
                  {value}
                </span>
                {unit && (
                  <span className="text-xs text-slate-500">{unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main layout: map + sidebar ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Map */}
          <div className="space-y-3">
            <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setEditorMode((prev) =>
                      prev === "boundary" ? "none" : "boundary"
                    );
                    setDraftRowStart(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    editorMode === "boundary"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                      : "bg-slate-950/50 text-slate-300 border border-white/[0.06] hover:bg-white/[0.03]"
                  }`}
                >
                  Definir límites
                </button>
                <button
                  onClick={() => {
                    setEditorMode((prev) =>
                      prev === "rows" ? "none" : "rows"
                    );
                    setDraftRowStart(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    editorMode === "rows"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                      : "bg-slate-950/50 text-slate-300 border border-white/[0.06] hover:bg-white/[0.03]"
                  }`}
                >
                  Definir hileras
                </button>
                <button
                  onClick={handleUndo}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950/50 text-slate-300 border border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  Deshacer
                </button>
                <button
                  onClick={() => setBoundaryPoints([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950/50 text-slate-300 border border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  Limpiar límites
                </button>
                <button
                  onClick={() => {
                    setRows([]);
                    setSelectedRow(null);
                    setDraftRowStart(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950/50 text-slate-300 border border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  Limpiar hileras
                </button>
                <button
                  onClick={copyHardcode}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 hover:bg-cyan-500/15 transition-colors"
                >
                  {copiedHardcode ? "Copiado" : "Copiar hardcode"}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {editorMode === "boundary"
                  ? "Modo límites activo: haz click en el mapa para agregar cada vértice del polígono."
                  : editorMode === "rows"
                    ? draftRowStart
                      ? "Modo hileras activo: marca el segundo punto para cerrar la hilera."
                      : "Modo hileras activo: marca inicio y fin de cada hilera."
                    : "Editor inactivo: puedes activar límites o hileras, y luego copiar el resultado para hardcodearlo."}
              </p>
            </div>

            <DensityMap
              center={FIELD_CENTER}
              zoom={18}
              rows={rows}
              showDensityLines={showDensityLines}
              boundary={showBoundary ? plantingBoundary : undefined}
              height="650px"
              visibleRows={visibleRows}
              selectedRow={selectedRow}
              editMode={editorMode}
              draftBoundary={editorMode === "boundary" ? boundaryPoints : undefined}
              draftRowStart={editorMode === "rows" ? draftRowStart : null}
              onMapClick={handleMapClick}
              onRowClick={
                editorMode === "none"
                  ? (id) =>
                      setSelectedRow((prev) => (prev === id ? null : id))
                  : undefined
              }
            />

            {/* Legend bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4">
                {(
                  Object.entries(CLASS_CONFIG) as [
                    DensityClass,
                    (typeof CLASS_CONFIG)[DensityClass],
                  ][]
                ).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setDensityFilter((prev) =>
                        prev === key ? "all" : key
                      )
                    }
                    className={`flex items-center gap-1.5 text-xs transition-all ${
                      densityFilter === key
                        ? "opacity-100"
                        : densityFilter === "all"
                          ? "opacity-70 hover:opacity-100"
                          : "opacity-30 hover:opacity-60"
                    }`}
                  >
                    <span
                      className="inline-block w-3 h-[3px] rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-slate-400">{cfg.label}</span>
                    <span className="text-slate-600 tabular-nums">
                      {stats.classCounts[key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={showDensityLines}
                    onChange={(e) => setShowDensityLines(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 rounded-full peer-checked:bg-cyan-900/60 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-slate-500 after:rounded-full after:transition-all peer-checked:after:translate-x-3 peer-checked:after:bg-cyan-400" />
                  Densidad
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={showBoundary}
                    onChange={(e) => setShowBoundary(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 rounded-full peer-checked:bg-cyan-900/60 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-slate-500 after:rounded-full after:transition-all peer-checked:after:translate-x-3 peer-checked:after:bg-cyan-400" />
                  Límites
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3 lg:max-h-[720px] lg:overflow-y-auto scrollbar-none">
            {/* Selected row detail panel */}
            {selectedRowData && selectedRowStats ? (
              <div className="bg-slate-900/40 rounded-xl border border-cyan-500/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Hilera {selectedRowData.id}
                  </h3>
                  <button
                    onClick={() => setSelectedRow(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["Promedio", selectedRowStats.avg.toFixed(1)],
                      ["Mín", selectedRowStats.min.toFixed(1)],
                      ["Máx", selectedRowStats.max.toFixed(1)],
                      ["Bulbos", selectedRowStats.bulbs.toString()],
                    ] as [string, string][]
                  ).map(([l, v]) => (
                    <div
                      key={l}
                      className="bg-slate-950/50 rounded-lg px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        {l}
                      </div>
                      <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini density sparkline */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Perfil de densidad
                  </div>
                  <div className="flex gap-[2px] items-end h-10">
                    {selectedRowData.segments.map((seg, i) => {
                      const norm =
                        (seg.density - stats.minDensity) /
                        (stats.maxDensity - stats.minDensity || 1);
                      const cfg =
                        CLASS_CONFIG[classifyDensity(seg.density)];
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${Math.max(12, norm * 100)}%`,
                            backgroundColor: cfg.color,
                            opacity: 0.8,
                          }}
                          title={`Segmento ${i + 1}: ${seg.density} bulbos/m`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4">
                <p className="text-xs text-slate-500 text-center py-4">
                  Haz click en una hilera en el mapa para ver su detalle
                </p>
              </div>
            )}

            {/* Rows list */}
            <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hileras
                </h3>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {rows.map((row) => {
                  const avgD =
                    row.segments.reduce((a, s) => a + s.density, 0) /
                    row.segments.length;
                  const cls = classifyDensity(avgD);
                  const cfg = CLASS_CONFIG[cls];
                  const isActive = selectedRow === row.id;

                  return (
                    <button
                      key={row.id}
                      onClick={() =>
                        setSelectedRow((prev) =>
                          prev === row.id ? null : row.id
                        )
                      }
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all ${
                        isActive
                          ? "bg-cyan-500/[0.06]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-1.5 h-5 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span
                          className={`text-sm font-medium ${isActive ? "text-white" : "text-slate-300"}`}
                        >
                          Hilera {row.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.tagBg} ${cfg.tagText}`}
                        >
                          {avgD.toFixed(1)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
