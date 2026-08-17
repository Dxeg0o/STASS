import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { aplicaciones } from "../../data/aplicaciones";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";
import { Reveal, SectionLabel } from "../../components/landing/shared";
import { contactEmail, demoHref } from "../../components/landing/cta";

const description =
  "La misma plataforma puede configurarse para terreno, recepción o líneas de proceso. El punto de instalación cambia; Qualiblick sigue siendo el mismo.";

export const metadata: Metadata = {
  title: "Aplicaciones | Qualiblick",
  description,
  alternates: { canonical: "https://www.qualiblick.com/aplicaciones" },
  openGraph: {
    title: "Qualiblick puede medir en distintos puntos de tu operación",
    description,
    url: "https://www.qualiblick.com/aplicaciones",
    siteName: "Qualiblick",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Aplicaciones de Qualiblick" }],
    locale: "es_CL",
    type: "website",
  },
};

export default function AplicacionesPage() {
  return (
    <main className="commercial-landing">
      <LandingNav currentPath="/aplicaciones" />

      <section className="page-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container">
          <div className="page-hero-copy">
            <SectionLabel>Aplicaciones</SectionLabel>
            <h1>Qualiblick puede medir en <span>distintos puntos</span> de tu operación.</h1>
            <p className="hero-lead">
              La misma plataforma puede configurarse para terreno, recepción o líneas de proceso.
            </p>
            <p className="page-hero-note">El punto de instalación cambia. Qualiblick sigue siendo el mismo.</p>
          </div>
        </div>
      </section>

      <section className="solutions-section section-space">
        <div className="landing-container application-list">
          {aplicaciones.map(({ slug, contexto, icon: Icon, cardHeadline, cardText }, index) => (
            <Reveal key={slug} delay={index * 0.08} className="application-row">
              <div className="application-row-label">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {contexto}</span>
              </div>
              <div className="application-row-copy">
                <h2>{cardHeadline}</h2>
                <p>{cardText}</p>
                <Link href={`/aplicaciones/${slug}`} className="inline-link">
                  Ver aplicación <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <h2>¿Dónde necesitas medir?</h2>
            <p>Cuéntanos qué estás midiendo actualmente y qué decisión depende de ese resultado.</p>
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
