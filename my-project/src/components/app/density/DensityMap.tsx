"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface RowSegment {
  start: [number, number];
  end: [number, number];
  density: number; // bulbs per meter
}

export interface PlantingRow {
  id: number;
  segments: RowSegment[];
}

interface DensityMapProps {
  center: [number, number];
  zoom?: number;
  rows: PlantingRow[];
  showDensityLines?: boolean;
  editMode?: "none" | "boundary" | "rows";
  boundary?: [number, number][];
  draftBoundary?: [number, number][];
  draftRowStart?: [number, number] | null;
  height?: string;
  visibleRows?: Set<number>;
  densityRange?: [number, number];
  selectedRow?: number | null;
  onMapClick?: (point: [number, number]) => void;
  onRowClick?: (rowId: number) => void;
}

function getRowsBounds(
  rows: PlantingRow[],
  visibleRows?: Set<number>
): L.LatLngBounds | null {
  const points: L.LatLngExpression[] = [];

  for (const row of rows) {
    if (visibleRows && !visibleRows.has(row.id)) continue;

    for (const seg of row.segments) {
      points.push(seg.start, seg.end);
    }
  }

  return points.length > 0 ? L.latLngBounds(points) : null;
}

function densityColor(density: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (density - min) / (max - min);
  // 5-stop: blue → cyan → green → amber → red
  if (t < 0.25) {
    const s = t / 0.25;
    return lerpColor("#3b82f6", "#22d3ee", s);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return lerpColor("#22d3ee", "#22c55e", s);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return lerpColor("#22c55e", "#f59e0b", s);
  } else {
    const s = (t - 0.75) / 0.25;
    return lerpColor("#f59e0b", "#ef4444", s);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff,
    ag = (ah >> 8) & 0xff,
    ab = ah & 0xff;
  const br = (bh >> 16) & 0xff,
    bg = (bh >> 8) & 0xff,
    bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, "0")}`;
}

export default function DensityMap({
  center,
  zoom = 18,
  rows,
  showDensityLines = true,
  editMode = "none",
  boundary,
  draftBoundary,
  draftRowStart,
  height = "650px",
  visibleRows,
  densityRange,
  selectedRow,
  onMapClick,
  onRowClick,
}: DensityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const boundaryRef = useRef<L.Layer | null>(null);
  const draftRef = useRef<L.LayerGroup | null>(null);
  const hasInitialViewRef = useRef(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 24,
      maxBoundsViscosity: 1,
    });

    // Allow visual over-zoom so we can inspect each row
    // without requesting tiles beyond the imagery provider's native depth.
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxNativeZoom: 18, maxZoom: 24 }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    mapRef.current = map;
    map.whenReady(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute global density bounds
  const getGlobalRange = useCallback((): [number, number] => {
    if (densityRange) return densityRange;
    let min = Infinity,
      max = -Infinity;
    for (const row of rows) {
      for (const seg of row.segments) {
        if (seg.density < min) min = seg.density;
        if (seg.density > max) max = seg.density;
      }
    }
    return [min === Infinity ? 0 : min, max === -Infinity ? 1 : max];
  }, [rows, densityRange]);

  // Render rows
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layersRef.current) {
      map.removeLayer(layersRef.current);
      layersRef.current = null;
    }

    if (!showDensityLines) {
      return;
    }

    const group = L.layerGroup();
    const [gMin, gMax] = getGlobalRange();

    for (const row of rows) {
      if (visibleRows && !visibleRows.has(row.id)) continue;

      const isSelected = selectedRow === row.id;
      const isOther = selectedRow != null && !isSelected;

      for (const seg of row.segments) {
        const color = densityColor(seg.density, gMin, gMax);
        const line = L.polyline([seg.start, seg.end], {
          color,
          weight: isSelected ? 6 : 4,
          opacity: isOther ? 0.15 : 0.9,
          lineCap: "round",
          lineJoin: "round",
        });

        line.bindTooltip(
          `<div style="font-family:system-ui;font-size:12px;line-height:1.4;padding:2px 4px;">
            <strong>Hilera ${row.id}</strong><br/>
            Densidad: <strong>${seg.density.toFixed(1)}</strong> bulbos/m
          </div>`,
          { sticky: true, className: "density-tooltip" }
        );

        if (onRowClick) {
          line.on("click", () => onRowClick(row.id));
        }

        line.addTo(group);
      }
    }

    group.addTo(map);
    layersRef.current = group;
  }, [
    rows,
    visibleRows,
    densityRange,
    selectedRow,
    onRowClick,
    getGlobalRange,
    showDensityLines,
  ]);

  // Editing interactions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = map.getContainer();
    container.style.cursor = editMode === "none" ? "" : "crosshair";

    if (editMode === "none" || !onMapClick) {
      return () => {
        container.style.cursor = "";
      };
    }

    const handleClick = (event: L.LeafletMouseEvent) => {
      onMapClick([event.latlng.lat, event.latlng.lng]);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
      container.style.cursor = "";
    };
  }, [editMode, onMapClick]);

  // Focus the initial view on the planted area once, then keep navigation free.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasInitialViewRef.current) return;

    const focusBounds =
      boundary && boundary.length > 0
        ? L.latLngBounds(boundary)
        : getRowsBounds(rows);
    if (!focusBounds) return;

    const paddedBounds = focusBounds.pad(0.02);
    const fitZoom = map.getBoundsZoom(paddedBounds, false, L.point(24, 24));
    map.setMaxBounds(undefined as unknown as L.LatLngBoundsExpression);
    map.setMinZoom(0);
    map.setView(focusBounds.getCenter(), Math.min(24, fitZoom + 1), {
      animate: false,
    });
    hasInitialViewRef.current = true;
  }, [rows, boundary, editMode]);

  // Boundary
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (boundaryRef.current) {
      map.removeLayer(boundaryRef.current);
      boundaryRef.current = null;
    }

    if (boundary && boundary.length > 0) {
      const poly = L.polygon(boundary, {
        color: "#94a3b8",
        weight: 1.5,
        fillOpacity: 0,
        dashArray: "6 4",
      }).addTo(map);
      boundaryRef.current = poly;
    }
  }, [boundary]);

  // Draft editing overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (draftRef.current) {
      map.removeLayer(draftRef.current);
      draftRef.current = null;
    }

    if (
      (!draftBoundary || draftBoundary.length === 0) &&
      !draftRowStart
    ) {
      return;
    }

    const group = L.layerGroup();

    if (draftBoundary && draftBoundary.length > 0) {
      const lineStyle = {
        color: "#22d3ee",
        weight: 2,
        opacity: 0.9,
        dashArray: "5 5",
      };

      if (draftBoundary.length >= 3) {
        L.polygon(draftBoundary, {
          ...lineStyle,
          fillOpacity: 0.05,
        }).addTo(group);
      } else {
        L.polyline(draftBoundary, lineStyle).addTo(group);
      }

      for (const point of draftBoundary) {
        L.circleMarker(point, {
          radius: 5,
          color: "#22d3ee",
          weight: 2,
          fillColor: "#020617",
          fillOpacity: 1,
        }).addTo(group);
      }
    }

    if (draftRowStart) {
      L.circleMarker(draftRowStart, {
        radius: 5,
        color: "#34d399",
        weight: 2,
        fillColor: "#020617",
        fillOpacity: 1,
      }).addTo(group);
    }

    group.addTo(map);
    draftRef.current = group;
  }, [draftBoundary, draftRowStart]);

  return (
    <>
      <style>{`
        .density-tooltip {
          background: rgba(2, 6, 23, 0.92) !important;
          border: 1px solid rgba(148, 163, 184, 0.2) !important;
          border-radius: 8px !important;
          color: #e2e8f0 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
          padding: 6px 10px !important;
        }
        .density-tooltip::before {
          border-top-color: rgba(2, 6, 23, 0.92) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.85) !important;
          color: #94a3b8 !important;
          border-color: rgba(148, 163, 184, 0.15) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          color: #22d3ee !important;
          background: rgba(15, 23, 42, 0.95) !important;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{ height, width: "100%" }}
        className="rounded-xl overflow-hidden ring-1 ring-white/[0.06]"
      />
    </>
  );
}
