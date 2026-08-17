"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { aplicaciones, getAplicacionBySlug } from "../../data/aplicaciones";
import { LazyVideo, Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { buildDemoHref, contactEmail } from "./cta";

export default function AplicacionPage({ slug }: { slug: string }) {
  const aplicacion = getAplicacionBySlug(slug);
  if (!aplicacion) return null;

  const demoHref = buildDemoHref(aplicacion.contexto);
  const otras = aplicaciones.filter((item) => item.slug !== aplicacion.slug);
  const Icon = aplicacion.icon;

  return (
    <main className="commercial-landing">
      <LandingNav demoHref={demoHref} />

      <section className="solution-hero-section">
        <div className="landing-container">
          <Link href="/#aplicaciones" className="solution-back-link">
            <ArrowLeft aria-hidden="true" /> Todas las aplicaciones
          </Link>

          <div className="solution-hero-grid">
            <Reveal className="solution-hero-copy">
              <SectionLabel><Icon aria-hidden="true" /> {aplicacion.contexto}</SectionLabel>
              <p className="solution-brand-descriptor">{aplicacion.title}</p>
              <h1>{aplicacion.heroTitle}</h1>
              <p className="hero-lead">{aplicacion.heroLead}</p>
              <div className="config-summary">
                <div>
                  <span>Captura</span>
                  <strong>{aplicacion.captura}</strong>
                </div>
                <div>
                  <span>Variables configuradas</span>
                  <strong>{aplicacion.variables.join(" · ")}</strong>
                </div>
              </div>
              <div className="hero-actions">
                <a href={demoHref} className="button button-primary">
                  Agenda una evaluación <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="solution-hero-visual">
              <div className={`method-image solution-hero-image${aplicacion.heroWide ? " solution-hero-image-bin-scan" : ""}`}>
                {aplicacion.mediaType === "video" ? (
                  <LazyVideo src={aplicacion.mediaSrc} ariaLabel={aplicacion.title} />
                ) : (
                  <Image src={aplicacion.mediaSrc} alt={aplicacion.title} fill sizes="(max-width: 900px) 100vw, 50vw" />
                )}
                <div className="method-overlay" />
                <div className="method-tag"><Icon aria-hidden="true" /> {aplicacion.contexto}</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="blindspot-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>El punto de partida</SectionLabel>
            <h2>{aplicacion.problem.title}</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>{aplicacion.problem.text}</p>
          </Reveal>
        </div>
      </section>

      <section className="methods-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Cómo se configura</SectionLabel>
            <h2>{aplicacion.title}, paso a paso.</h2>
          </Reveal>
        </div>

        <div className="landing-container solution-steps">
          {aplicacion.steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08} className="solution-step-card">
              <span className="method-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {aplicacion.resultsMedia && (
        <section className="solution-results-section section-space">
          <div className="landing-container solution-results-grid">
            <Reveal className="solution-results-copy">
              <SectionLabel>El resultado</SectionLabel>
              <h2>Una medición estructurada, lista para usarse.</h2>
              <p>En una sola vista, el equipo entiende la composición real de lo medido y puede decidir con una base comparable entre lotes.</p>
              <ul>
                <li><strong>Color:</strong> lectura consistente del nivel predominante.</li>
                <li><strong>Tamaño:</strong> distribución por calibre sobre todo lo medido.</li>
                <li><strong>Calidad:</strong> clasificación con un criterio único y trazable.</li>
              </ul>
            </Reveal>
            <Reveal delay={0.12} className="solution-results-visual">
              <Image src={aplicacion.resultsMedia.src} alt={aplicacion.resultsMedia.alt} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 55vw" />
            </Reveal>
          </div>
        </section>
      )}

      <section className="impact-section section-space">
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>Por qué importa</SectionLabel>
              <h2>Qué cambia con esta configuración.</h2>
            </Reveal>
          </div>

          <div className="impact-grid">
            {aplicacion.benefits.map(({ icon: BenefitIcon, title, text }, index) => (
              <Reveal key={title} delay={index * 0.08} className="impact-card">
                <div className="impact-card-top"><BenefitIcon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="validation-section section-space">
        <div className="landing-container">
          <Reveal className="solution-proof">
            <Check aria-hidden="true" />
            <p>{aplicacion.proofPoint}</p>
          </Reveal>
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <h2>¿Qué estás midiendo hoy con una muestra?</h2>
            <p>Cuéntanos qué necesitas medir, cómo lo haces actualmente y qué decisión depende de ese resultado.</p>
            <a href={demoHref} className="button button-primary button-large">
              Agenda una evaluación <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> {contactEmail}</span>
          </Reveal>
        </div>
      </section>

      <section className="section-space solution-other-section">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Explora más</SectionLabel>
            <h2>Otras aplicaciones de la plataforma</h2>
          </Reveal>
        </div>
        <div className="landing-container solutions-grid">
          {otras.map(({ slug: otherSlug, contexto, icon: OtherIcon, summary }, index) => (
            <Reveal key={otherSlug} delay={index * 0.08} className="solution-card">
              <Link href={`/aplicaciones/${otherSlug}`} className="solution-card-link">
                <span className="solution-card-tag"><OtherIcon aria-hidden="true" /> {contexto}</span>
                <p>{summary}</p>
                <span className="solution-card-cta">Ver esta configuración <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
