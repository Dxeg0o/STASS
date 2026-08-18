"use client";

import { useEffect, useRef } from "react";

type UnitFieldProps = {
  /** Columnas de la grilla de unidades. Se reduce si las celdas quedarían muy chicas. */
  cols: number;
  /** Filas. Con `square` se calculan desde el alto para que la celda quede cuadrada. */
  rows: number;
  /** Deriva las filas del alto disponible para mantener la celda cuadrada. */
  square?: boolean;
  /** Fracción de unidades medidas, entre 0 y 1. */
  coverage: number;
  /** Se llena al entrar en pantalla en vez de dibujarse completo. */
  animate?: boolean;
  /** Separación entre celdas, en píxeles CSS. */
  gap?: number;
  /** Celdas redondas en vez de cuadradas. */
  round?: boolean;
  className?: string;
  ariaLabel?: string;
};

const DURATION = 1200;

/** Mezcla determinista: el mismo campo se dibuja igual en cada render y en SSR. */
function scatter(total: number) {
  const order = new Array<number>(total);
  for (let i = 0; i < total; i += 1) order[i] = i;
  let seed = 7;
  for (let i = total - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}

export default function UnitField({
  cols,
  rows,
  square = false,
  coverage,
  animate = false,
  gap = 2,
  round = false,
  className = "",
  ariaLabel,
}: UnitFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const progress = useRef(animate ? 0 : 1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // La mezcla se calcula para la grilla máxima y se reutiliza al reescalar.
    const order = scatter(cols * rows * 4);
    const lit = new Set<number>();
    let frame = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;

      // Nunca dibujar celdas por debajo de 7px: en móvil la grilla se aclara sola.
      const maxCols = Math.max(6, Math.floor((width + gap) / (7 + gap)));
      const c = Math.min(cols, maxCols);
      const cellSide = (width - gap * (c - 1)) / c;
      const r = square
        ? Math.max(1, Math.round((height + gap) / (cellSide + gap)))
        : Math.min(rows, Math.max(1, Math.floor((height + gap) / (7 + gap))));
      const total = c * r;

      const styles = getComputedStyle(canvas);
      const litColor = styles.getPropertyValue("--uf-lit").trim() || "#19c66b";
      const dimColor = styles.getPropertyValue("--uf-dim").trim() || "rgba(255,255,255,.06)";

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cellW = (width - gap * (c - 1)) / c;
      const cellH = (height - gap * (r - 1)) / r;
      const shown = Math.round(total * coverage * progress.current);

      lit.clear();
      for (let i = 0, taken = 0; i < order.length && taken < shown; i += 1) {
        if (order[i] >= total) continue;
        lit.add(order[i]);
        taken += 1;
      }

      for (let index = 0; index < total; index += 1) {
        const x = (index % c) * (cellW + gap);
        const y = Math.floor(index / c) * (cellH + gap);
        ctx.fillStyle = lit.has(index) ? litColor : dimColor;
        if (round) {
          const r = Math.min(cellW, cellH) / 2;
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, cellW, cellH);
        }
      }
    };

    const run = () => {
      // En una pestaña en segundo plano rAF no corre: se dibuja completo de una vez
      // para que el campo nunca quede vacío.
      if (document.hidden) {
        progress.current = 1;
        draw();
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        progress.current = 1 - Math.pow(1 - t, 3);
        draw();
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    draw();

    let observer: IntersectionObserver | undefined;
    if (animate && !reduce && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer?.disconnect();
            run();
          });
        },
        { threshold: 0.25 }
      );
      observer.observe(canvas);
    } else {
      progress.current = 1;
      draw();
    }

    const resize = new ResizeObserver(() => draw());
    resize.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resize.disconnect();
    };
  }, [cols, rows, square, coverage, animate, gap, round]);

  return (
    <canvas
      ref={ref}
      className={`unit-field ${className}`.trim()}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
