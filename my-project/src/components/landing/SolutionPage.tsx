"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Mail, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import { getSolucionBySlug, soluciones } from "../../data/soluciones";
import { LazyVideo, Reveal, SectionLabel } from "./shared";

export default function SolutionPage({ slug }: { slug: string }) {
  const solucion = getSolucionBySlug(slug);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!solucion) return null;
  const closeMenu = () => setMenuOpen(false);
  const demoHref = `mailto:contacto@qualiblick.com?subject=${encodeURIComponent(
    `Solicitud de demostración — ${solucion.ctaSubject}`
  )}&body=${encodeURIComponent(
    `Hola equipo Qualiblick,\n\nMe gustaría conocer más sobre ${solucion.name}.\n\nEmpresa:\nCultivo:\nVolumen aproximado:\n\nGracias.`
  )}`;

  const otherSoluciones = soluciones.filter((item) => item.slug !== solucion.slug);
  const Icon = solucion.icon;

  return (
    <main className="commercial-landing">
      <nav className="landing-nav" aria-label="Navegación principal">
        <div className="landing-container nav-inner">
          <Link href="/" className="brand-link" aria-label="Qualiblick, volver al inicio">
            <Image src="/images/qb.png" alt="Qualiblick" width={176} height={40} priority className="brand-logo" />
          </Link>

          <div className="nav-links">
            <Link href="/#soluciones">Soluciones</Link>
            <Link href="/#impacto">Impacto</Link>
            <Link href="/#validacion">Resultados</Link>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-login">Ingresar</Link>
            <a href={demoHref} className="button button-small button-primary">Solicita una demo</a>
          </div>

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-navigation" className="mobile-navigation">
            <Link href="/#soluciones" onClick={closeMenu}>Soluciones</Link>
            <Link href="/#impacto" onClick={closeMenu}>Impacto</Link>
            <Link href="/#validacion" onClick={closeMenu}>Resultados</Link>
            <Link href="/login" onClick={closeMenu}>Ingresar</Link>
            <a href={demoHref} className="button button-primary" onClick={closeMenu}>Solicita una demo</a>
          </div>
        )}
      </nav>

      <section className="solution-hero-section">
        <div className="landing-container">
          <Link href="/#soluciones" className="solution-back-link">
            <ArrowLeft aria-hidden="true" /> Todas las soluciones
          </Link>

          <div className="solution-hero-grid">
            <Reveal className="solution-hero-copy">
              <SectionLabel><Icon aria-hidden="true" /> {solucion.moment}</SectionLabel>
              <p className="solution-brand-descriptor">{solucion.name} <span>{solucion.descriptor}</span></p>
              <h1>{solucion.heroTitle}</h1>
              <p className="hero-lead">{solucion.heroLead}</p>
              <div className="hero-actions">
                <a href={demoHref} className="button button-primary">
                  Solicita una demostración <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="solution-hero-visual">
              <div className={`method-image solution-hero-image ${solucion.slug === "diagnostico-de-recepcion" ? "solution-hero-image-bin-scan" : ""}`}>
                {solucion.mediaType === "video" ? (
                  <LazyVideo src={solucion.mediaSrc} ariaLabel={solucion.name} />
                ) : (
                  <Image src={solucion.mediaSrc} alt={solucion.name} fill sizes="(max-width: 900px) 100vw, 50vw" />
                )}
                <div className="method-overlay" />
                <div className="method-tag"><Icon aria-hidden="true" /> {solucion.moment}</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="blindspot-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>El problema</SectionLabel>
            <h2>{solucion.problem.title}</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>{solucion.problem.text}</p>
          </Reveal>
        </div>
      </section>

      <section className="methods-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2>{solucion.name}, paso a paso.</h2>
          </Reveal>
        </div>

        <div className="landing-container solution-steps">
          {solucion.steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08} className="solution-step-card">
              <span className="method-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {solucion.resultsMedia && (
        <section className="solution-results-section section-space">
          <div className="landing-container solution-results-grid">
            <Reveal className="solution-results-copy">
              <SectionLabel>El resultado</SectionLabel>
              <h2>Un perfil del bin listo para decidir.</h2>
              <p>En una sola vista, el equipo puede entender la composición real del producto y usarla para definir su mejor destino.</p>
              <ul>
                <li><strong>Color:</strong> identifica el nivel de madurez predominante.</li>
                <li><strong>Tamaño:</strong> muestra la distribución por calibre.</li>
                <li><strong>Calidad:</strong> separa fruta apta y defectuosa con criterios consistentes.</li>
              </ul>
            </Reveal>
            <Reveal delay={0.12} className="solution-results-visual">
              <Image src={solucion.resultsMedia.src} alt={solucion.resultsMedia.alt} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 55vw" />
            </Reveal>
          </div>
        </section>
      )}

      <section className="impact-section section-space">
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>Por qué importa</SectionLabel>
              <h2>Beneficios de {solucion.name.toLowerCase()}.</h2>
            </Reveal>
          </div>

          <div className="impact-grid">
            {solucion.benefits.map(({ icon: BenefitIcon, title, text }, index) => (
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
            <p>{solucion.proofPoint}</p>
          </Reveal>
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <h2>¿Conversamos sobre {solucion.name.toLowerCase()}?</h2>
            <p>Cuéntanos tu cultivo, volumen y momento del proceso que quieres cubrir.</p>
            <a href={demoHref} className="button button-primary button-large">
              Solicita una demostración <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> contacto@qualiblick.com</span>
          </Reveal>
        </div>
      </section>

      <section className="section-space solution-other-section">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Explora más</SectionLabel>
            <h2>Otras soluciones Qualiblick</h2>
          </Reveal>
        </div>
        <div className="landing-container solutions-grid">
          {otherSoluciones.map(({ slug, moment, icon: OtherIcon, name, descriptor, tagline }, index) => (
            <Reveal key={slug} delay={index * 0.08} className="solution-card">
              <Link href={`/soluciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><OtherIcon aria-hidden="true" /> {moment}</span>
                <h3>{name}</h3>
                <span className="solution-card-descriptor">{descriptor}</span>
                <p>{tagline}</p>
                <span className="solution-card-cta">Ver solución <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div>
            <Image src="/images/qb.png" alt="Qualiblick" width={170} height={40} className="footer-logo" />
            <p>Datos reales para capturar más valor en cada etapa de la poscosecha.</p>
          </div>
          <div className="footer-links">
            <Link href="/#soluciones">Soluciones</Link>
            <Link href="/#impacto">Impacto</Link>
            <Link href="/#edge">Tecnología</Link>
            <Link href="/#validacion">Resultados</Link>
          </div>
          <div className="footer-contact">
            <a href="mailto:contacto@qualiblick.com"><Mail aria-hidden="true" /> contacto@qualiblick.com</a>
            <span><MapPin aria-hidden="true" /> Santiago, Chile</span>
          </div>
        </div>
        <div className="landing-container footer-bottom">
          <span>© 2026 Qualiblick. Todos los derechos reservados.</span>
          <Link href="/login">Acceso a plataforma</Link>
        </div>
      </footer>
    </main>
  );
}
