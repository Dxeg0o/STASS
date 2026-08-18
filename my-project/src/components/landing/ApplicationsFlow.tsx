"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./shared";
import { aplicaciones } from "../../data/aplicaciones";

/**
 * Las tres aplicaciones dejan de ser tarjetas sueltas y pasan a leerse como un
 * recorrido: un riel marca en qué estación estás mientras haces scroll, y
 * apuntar a una estación resalta su tarjeta.
 */
export default function ApplicationsFlow() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const nodes = cardsRef.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = nodes.indexOf(visible.target as HTMLDivElement);
        if (index >= 0) setActive(index);
      },
      { threshold: [0.35, 0.6, 0.9], rootMargin: "-20% 0px -30% 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const current = pinned ?? active;

  return (
    // Un solo contenedor envuelve riel y tarjetas: así el riel tiene recorrido
    // para quedarse fijo mientras pasan las tres estaciones.
    <div className="landing-container applications-flow">
      <div className="station-rail" role="presentation">
          {aplicaciones.map(({ slug, contexto }, index) => (
            <button
              key={slug}
              type="button"
              className={`station${index === current ? " station-active" : ""}`}
              onMouseEnter={() => setPinned(index)}
              onMouseLeave={() => setPinned(null)}
              onFocus={() => setPinned(index)}
              onBlur={() => setPinned(null)}
              onClick={() => {
                cardsRef.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              aria-label={`Ir a ${contexto}`}
            >
              <span className="station-marker" aria-hidden="true" />
              <span className="station-name">{contexto}</span>
            </button>
        ))}
      </div>

      <div className="solutions-grid solutions-grid-stations">
        {aplicaciones.map(({ slug, contexto, icon: Icon, cardHeadline }, index) => (
          <Reveal
            key={slug}
            delay={index * 0.06}
            className={`solution-card${index === current ? " solution-card-current" : ""}`}
          >
            <div ref={(node) => { cardsRef.current[index] = node; }}>
              <Link href={`/aplicaciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {contexto}</span>
                <p>{cardHeadline}</p>
                <span className="solution-card-cta">Ver aplicación <ArrowRight aria-hidden="true" /></span>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
