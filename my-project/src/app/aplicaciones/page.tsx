import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { aplicaciones } from "../../data/aplicaciones";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";
import { Reveal, SectionLabel } from "../../components/landing/shared";

export const metadata: Metadata = {
  title: "Aplicaciones de Qualiblick | Qualiblick",
  description:
    "Una sola plataforma configurable para medir en terreno, recepción y línea de proceso. Conoce cómo se configura Qualiblick en cada punto de la operación.",
  alternates: { canonical: "https://www.qualiblick.com/aplicaciones" },
};

export default function AplicacionesPage() {
  return (
    <main className="commercial-landing">
      <LandingNav currentPath="/aplicaciones" />

      <section className="aplicaciones-index-section">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Aplicaciones</SectionLabel>
            <h2>Una plataforma, distintos puntos de medición.</h2>
            <p>Qualiblick es un solo producto. Lo que cambia es qué se mide, dónde y con qué forma de captura.</p>
          </Reveal>
        </div>

        <div className="landing-container solutions-grid">
          {aplicaciones.map(({ slug, contexto, icon: Icon, summary }, index) => (
            <Reveal key={slug} delay={index * 0.08} className="solution-card">
              <Link href={`/aplicaciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {contexto}</span>
                <p>{summary}</p>
                <span className="solution-card-cta">Ver aplicación <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
