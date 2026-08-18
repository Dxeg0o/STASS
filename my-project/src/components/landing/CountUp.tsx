"use client";

import { useEffect, useRef, useState } from "react";

const DURATION = 1400;
const formatter = new Intl.NumberFormat("es-CL");

type Parsed = { prefix: string; value: number; decimals: number; suffix: string };

/**
 * Separa "97,54%" en prefijo, número y sufijo para poder animar solo la cifra.
 * Devuelve null cuando el texto no tiene una cifra que valga la pena animar
 * (por ejemplo "24/7"), y en ese caso el valor se muestra tal cual.
 */
function parse(text: string): Parsed | null {
  // "24/7" es una razón, no una cifra que deba contar hacia arriba.
  if (/\d\s*\/\s*\d/.test(text)) return null;
  const match = text.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return null;

  const [, prefix, digits, suffix] = match;
  const decimalMatch = digits.match(/,(\d+)$/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;
  const numeric = Number(digits.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) return null;

  return { prefix, value: numeric, decimals, suffix };
}

function render({ prefix, value, decimals, suffix }: Parsed, ratio: number) {
  const current = value * ratio;
  const body = decimals
    ? current.toFixed(decimals).replace(".", ",")
    : formatter.format(Math.round(current));
  return `${prefix}${body}${suffix}`;
}

export default function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const node = ref.current;
    const parsed = parse(value);
    if (!node || !parsed) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;

    // El texto arranca en su valor real: si el observer nunca llega a disparar,
    // la cifra que se ve sigue siendo la correcta.
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          if (document.hidden) return;
          setText(render(parsed, 0));
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            setText(render(parsed, 1 - Math.pow(1 - t, 3)));
            if (t < 1) frame = requestAnimationFrame(step);
          };
          frame = requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only-value">{value}</span>
    </span>
  );
}
