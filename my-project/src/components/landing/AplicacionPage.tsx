"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock3, Cpu, Mail, Zap } from "lucide-react";
import { getAplicacionBySlug, metrics } from "../../data/aplicaciones";
import { LazyVideo, Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { buildDemoHref, contactEmail } from "./cta";

const techIcons = [Cpu, Zap, Clock3];

export default function AplicacionPage({ slug }: { slug: string }) {
  const aplicacion = getAplicacionBySlug(slug);
  if (!aplicacion) return null;

  const demoHref = buildDemoHref(aplicacion.contexto);
  const Icon = aplicacion.icon;
  const nextAplicacion = aplicacion.next ? getAplicacionBySlug(aplicacion.next.slug) : undefined;

  return (
    <main className="commercial-landing">
      <LandingNav currentPath="/aplicaciones" demoHref={demoHref} />

      <section className="solution-hero-section">
        <div className="landing-container">
          <Link href="/aplicaciones" className="solution-back-link">
            <ArrowLeft aria-hidden="true" /> Todas las aplicaciones
          </Link>

          <div className="solution-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="solution-hero-copy"
            >
              <SectionLabel><Icon aria-hidden="true" /> {aplicacion.eyebrow}</SectionLabel>
              <h1>{aplicacion.heroTitle}</h1>
              {aplicacion.heroLead.map((paragraph) => (
                <p key={paragraph} className="hero-lead">{paragraph}</p>
              ))}
              <div className="hero-actions">
                <a href={demoHref} className="button button-primary">
                  Agenda una evaluación <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </motion.div>

            <Reveal delay={0.12} className="solution-hero-visual">
              <div className={`method-image solution-hero-image${aplicacion.heroWide ? " solution-hero-image-bin-scan" : ""}`}>
                {aplicacion.mediaType === "video" ? (
                  <LazyVideo src={aplicacion.mediaSrc} ariaLabel={aplicacion.eyebrow} />
                ) : (
                  <Image src={aplicacion.mediaSrc} alt={aplicacion.eyebrow} fill sizes="(max-width: 900px) 100vw, 50vw" />
                )}
                <div className="method-overlay" />
                <div className="method-tag"><Icon aria-hidden="true" /> {aplicacion.contexto}</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="capability-section section-space">
        <div className="landing-container">
          <Reveal className="variables-heading">
            <SectionLabel>Variables</SectionLabel>
            <h2>Qué puedes medir en este punto.</h2>
            {aplicacion.variablesNote && <p className="variables-note">{aplicacion.variablesNote}</p>}
          </Reveal>
          <Reveal delay={0.1} className="variable-pills">
            {aplicacion.variables.map((variable) => (
              <span key={variable}>{variable}</span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="detail-section section-space">
        <div className="landing-container detail-blocks">
          {aplicacion.blocks.map(({ title, text, items }, index) => (
            <Reveal key={title} delay={index * 0.06} className="detail-block">
              <h2>{title}</h2>
              {text && <p>{text}</p>}
              {items && (
                <ul className="detail-list">
                  {items.map((item) => (
                    <li key={item}><Check aria-hidden="true" /> {item}</li>
                  ))}
                </ul>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {aplicacion.techCards && (
        <section className="edge-section section-space">
          <div className="landing-container centered-heading">
            <Reveal>
              <SectionLabel>Tecnología</SectionLabel>
              <h2>Diseñado para operar en planta.</h2>
            </Reveal>
          </div>
          <div className="landing-container tech-grid">
            {aplicacion.techCards.map(({ title, text }, index) => {
              const TechIcon = techIcons[index % techIcons.length];
              return (
                <Reveal key={title} delay={index * 0.06} className="tech-card">
                  <TechIcon aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {aplicacion.showMetrics && (
        <section className="validation-section section-space">
          <div className="landing-container centered-heading">
            <Reveal>
              <SectionLabel>Evidencia</SectionLabel>
              <h2>Probado en condiciones reales.</h2>
            </Reveal>
          </div>
          <div className="landing-container">
            <Reveal className="metrics-row metrics-row-light">
              {metrics.map(({ value, label }) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {nextAplicacion && aplicacion.next && (
        <section className="next-application-section">
          <div className="landing-container">
            <Reveal className="next-application">
              <span>Siguiente punto de medición</span>
              <Link href={`/aplicaciones/${nextAplicacion.slug}`} className="button button-secondary">
                {aplicacion.next.label} <ArrowRight aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <h2>{aplicacion.ctaTitle}</h2>
            <p>{aplicacion.ctaText}</p>
            <a href={demoHref} className="button button-primary button-large">
              Agenda una evaluación <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> {contactEmail}</span>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
