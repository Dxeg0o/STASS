"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Camera,
  Check,
  ChevronRight,
  CircleGauge,
  Clock3,
  Cpu,
  Hash,
  Layers,
  Locate,
  Mail,
  MapPin,
  Palette,
  Plus,
  Ruler,
  ScanLine,
  Smartphone,
  Sparkles,
  Sprout,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { contactEmail, demoHref } from "./cta";

const heroPoints = [
  { icon: Layers, text: "Más representatividad" },
  { icon: Check, text: "Un mismo criterio" },
  { icon: Clock3, text: "Datos a tiempo" },
];

const captureModes = [
  { icon: Camera, label: "Cámara fija", active: true },
  { icon: Wrench, label: "Retrofit", active: false },
  { icon: Smartphone, label: "Móvil", active: false },
];

const heroVariables = ["Conteo", "Calibre", "Color", "Defectos"];

const capabilities = [
  { icon: Hash, title: "Conteo", text: "Aumenta significativamente la cantidad de unidades observadas frente a un muestreo tradicional." },
  { icon: Ruler, title: "Calibre", text: "Dimensiones y distribución de tamaños con un criterio único." },
  { icon: Palette, title: "Color", text: "Lectura consistente del color, sin depender de la apreciación de cada turno." },
  { icon: AlertTriangle, title: "Defectos", text: "Clasificación de lo que se aparta del estándar definido con tu equipo." },
  { icon: BarChart3, title: "Distribución", text: "Cómo se reparte el volumen entre categorías, no solo el promedio." },
  { icon: Locate, title: "Densidad y posición", text: "Cuántas unidades hay y cómo están dispuestas en el espacio medido." },
];

const applications = [
  {
    slug: "terreno",
    contexto: "Terreno",
    icon: Sprout,
    text: "Medición en el predio, con el mismo criterio que se usa en planta.",
  },
  {
    slug: "recepcion",
    contexto: "Recepción",
    icon: Boxes,
    text: "Medición del producto que entra, antes de moverlo a línea, frío o venta.",
  },
  {
    slug: "proceso",
    contexto: "Línea de proceso",
    icon: ScanLine,
    text: "Medición continua sobre la línea activa, a alta velocidad y sin detener la producción.",
  },
];

const expansion = [
  { stage: "01 — Recepción", title: "Calibre y distribución del lote" },
  { stage: "02 — Proceso", title: "Conteo y control durante la línea" },
  { stage: "03 — Terreno", title: "Medición antes de llegar a planta" },
  { stage: "En conjunto", title: "Una misma infraestructura de medición" },
];

const process = [
  {
    number: "01",
    title: "Entendemos",
    text: "Qué decisión quieres mejorar, qué información necesitas y cómo se obtiene hoy.",
  },
  {
    number: "02",
    title: "Configuramos",
    text: "Variables, forma de captura y hardware según tu operación.",
  },
  {
    number: "03",
    title: "Instalamos",
    text: "Integramos la medición en el proceso existente, con el mínimo cambio operacional.",
  },
  {
    number: "04",
    title: "Medimos",
    text: "Resultados estructurados por lote, proceso, ubicación o período, listos para usarse.",
  },
];

const reasons = [
  {
    number: "01",
    icon: Layers,
    title: "Mayor cobertura",
    text: "Muchas más unidades medidas que en un muestreo manual, en el mismo tiempo de operación.",
  },
  {
    number: "02",
    icon: Check,
    title: "Mayor consistencia",
    text: "El mismo criterio en cada turno, cada punto de medición y cada temporada.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Información estructurada",
    text: "Resultados organizados y comparables, listos para usarse en tus decisiones.",
  },
];

export default function CommercialLanding() {
  return (
    <main className="commercial-landing">
      <LandingNav isHome />

      <section id="inicio" className="hero-section">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="hero-copy"
          >
            <SectionLabel>Medición inteligente para la agroindustria</SectionLabel>
            <h1>Mide más de tu operación. <span>Decide con mejores datos.</span></h1>
            <p className="hero-lead">
              Qualiblick transforma muestreos manuales y poco representativos en sistemas de medición objetivos y automatizados. Configuramos qué medir, cómo capturarlo y dónde instalarlo según las necesidades de tu operación.
            </p>

            <div className="hero-actions">
              <a href={demoHref} className="button button-primary">
                Agenda una evaluación <ArrowRight aria-hidden="true" />
              </a>
              <Link href="#como-funciona" className="button button-secondary">
                Conoce cómo funciona <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="outcome-list" aria-label="Qué cambia con Qualiblick">
              {heroPoints.map(({ icon: Icon, text }) => (
                <div className="outcome-item" key={text}>
                  <span><Icon aria-hidden="true" /></span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hero-visual"
          >
            <div className="video-frame">
              <video autoPlay loop muted playsInline poster="/images/valdivia_lilies.jpg" aria-label="Qualiblick midiendo producto dentro de una operación agroindustrial">
                <source src="/videos/example2.mp4" type="video/mp4" />
              </video>
              <div className="video-vignette" />
              <div className="scan-line" aria-hidden="true" />

              <div className="live-badge"><span /> MIDIENDO</div>

              <div className="capture-chips" aria-label="Formas de captura disponibles">
                {captureModes.map(({ icon: Icon, label, active }) => (
                  <span key={label} className={`capture-chip${active ? " capture-chip-active" : ""}`}>
                    <Icon aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>

              <div className="variables-panel">
                <div className="panel-header">
                  <div><ScanLine aria-hidden="true" /> Variables configuradas</div>
                  <span>RECEPCIÓN</span>
                </div>
                <div className="variables-grid">
                  {heroVariables.map((variable) => (
                    <span key={variable}><Check aria-hidden="true" /> {variable}</span>
                  ))}
                </div>
                <div className="panel-footer">
                  <span><Check aria-hidden="true" /> Resultado estructurado</span>
                  <strong>1.284 unidades medidas</strong>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="blindspot-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>El punto de partida</SectionLabel>
            <h2>Decisiones grandes todavía dependen de muestras muy pequeñas.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Miles o millones de unidades pueden terminar representadas por una muestra de apenas una fracción del total. Ese resultado se usa después para vender, planificar, negociar y ajustar el proceso, sin saber con certeza qué tan representativa es del total.</p>
          </Reveal>
        </div>

        <div className="landing-container comparison-grid">
          <Reveal className="comparison-card comparison-old">
            <span className="comparison-kicker">Muestreo tradicional</span>
            <h3>Una parte mínima intenta representar la operación completa.</h3>
            <ul>
              <li><X aria-hidden="true" /> Muestra pequeña</li>
              <li><X aria-hidden="true" /> Medición manual</li>
              <li><X aria-hidden="true" /> Estimación y criterios que varían</li>
            </ul>
            <div className="sample-visual sample-small">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 4 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Muestra limitada</strong><span>Menor representatividad</span></p>
          </Reveal>

          <Reveal delay={0.12} className="comparison-card comparison-new">
            <span className="comparison-kicker">Con Qualiblick</span>
            <h3>La medición cubre una parte mucho mayor de lo que realmente pasa.</h3>
            <ul>
              <li><Check aria-hidden="true" /> Mayor cobertura</li>
              <li><Check aria-hidden="true" /> Medición automatizada</li>
              <li><Check aria-hidden="true" /> Datos objetivos y estructurados</li>
            </ul>
            <div className="sample-visual sample-large">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 30 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Mayor cobertura</strong><span>Más información para decidir</span></p>
          </Reveal>
        </div>

        <div className="landing-container">
          <Reveal className="section-closing-note">
            <p>Más cobertura significa más información para respaldar cada decisión.</p>
          </Reveal>
        </div>
      </section>

      <section id="solucion" className="platform-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>Una sola plataforma</SectionLabel>
            <h2>Qualiblick es una plataforma de medición configurable.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Definimos qué necesitas medir, elegimos la forma de captura adecuada y la integramos a tu operación. Una misma plataforma puede adaptarse a distintos procesos, variables y puntos de medición.</p>
          </Reveal>
        </div>
      </section>

      <section id="variables" className="capability-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Qué puede medir</SectionLabel>
            <h2>Distintas variables. Una misma plataforma.</h2>
            <p>Definimos con tu equipo qué variables importan para la decisión que quieres mejorar.</p>
          </Reveal>
        </div>

        <div className="landing-container capability-grid">
          {capabilities.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 0.06} className="capability-card">
              <span className="capability-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
          <Reveal delay={0.36} className="capability-card capability-card-open">
            <span className="capability-icon"><Plus aria-hidden="true" /></span>
            <h3>¿Necesitas medir otra variable?</h3>
            <p>Evaluamos si puede incorporarse dentro de Qualiblick.</p>
            <a href={demoHref} className="capability-open-cta">Conversemos <ArrowRight aria-hidden="true" /></a>
          </Reveal>
        </div>
      </section>

      <section id="aplicaciones" className="solutions-section section-space">
        <span id="soluciones" className="anchor-alias" aria-hidden="true" />
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Dónde puede usarse</SectionLabel>
            <h2>Una plataforma que se adapta a tu operación.</h2>
            <p>La misma plataforma se configura para distintos puntos de medición, dentro y fuera de la planta.</p>
          </Reveal>
        </div>

        <div className="landing-container solutions-grid">
          {applications.map(({ slug, contexto, icon: Icon, text }, index) => (
            <Reveal key={contexto} delay={index * 0.06} className="solution-card">
              <Link href={`/aplicaciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {contexto}</span>
                <p>{text}</p>
                <span className="solution-card-cta">Ver aplicación <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="landing-container">
          <Reveal className="capture-note">
            <Camera aria-hidden="true" />
            <p>Distintas formas de captura según el proceso: equipos fijos, retrofit sobre maquinaria existente o dispositivos móviles.</p>
          </Reveal>
        </div>
      </section>

      <section id="diferenciacion" className="differentiation-section section-space">
        <div className="landing-container differentiation-grid">
          <Reveal className="differentiation-copy">
            <SectionLabel>Configurable, no hecho desde cero</SectionLabel>
            <h2>Nos adaptamos al muestreo. No al revés.</h2>
            <p>Buena parte de la tecnología agrícola está construida alrededor de una sola máquina, variable, cultivo o etapa del proceso. Qualiblick no parte de un equipo, parte de una pregunta: qué necesitas medir.</p>
            <p>Eso permite empezar resolviendo un punto concreto y después extender la misma plataforma a otros puntos de medición dentro de la misma empresa.</p>
          </Reveal>

          <Reveal delay={0.12} className="expansion-ladder" aria-label="Expansión de la medición dentro de una misma operación">
            {expansion.map(({ stage, title }, index) => (
              <div key={stage} className={`expansion-step${index === expansion.length - 1 ? " expansion-step-final" : ""}`}>
                <span className="expansion-stage">{stage}</span>
                <strong>{title}</strong>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="como-funciona" className="methods-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2>De una decisión concreta a una medición en operación.</h2>
          </Reveal>
        </div>

        <div className="landing-container process-grid">
          {process.map(({ number, title, text }, index) => (
            <Reveal key={number} delay={index * 0.06} className="process-card">
              <span className="method-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="tecnologia" className="edge-section section-space">
        <span id="edge" className="anchor-alias" aria-hidden="true" />
        <div className="landing-container edge-grid">
          <Reveal className="edge-copy">
            <SectionLabel>Equipo + software + inteligencia artificial</SectionLabel>
            <h2>La medición ocurre donde ocurre tu operación.</h2>
            <p>Detrás de Qualiblick hay hardware adaptado al proceso, modelos de inteligencia artificial y software para estructurar los resultados. El análisis se hace dentro de tu instalación, así que los resultados están disponibles de inmediato y la medición sigue funcionando con conectividad limitada.</p>
            <div className="edge-benefits">
              <div><Cpu aria-hidden="true" /><span><strong>Procesamiento local</strong>El análisis ocurre en tu instalación</span></div>
              <div><Clock3 aria-hidden="true" /><span><strong>Resultados en el momento</strong>Sin esperar un informe posterior</span></div>
              <div><Zap aria-hidden="true" /><span><strong>Operación continua</strong>Funciona con conectividad limitada</span></div>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="edge-visual">
            <div className="edge-rings" aria-hidden="true"><i /><i /><i /></div>
            <div className="edge-device"><Cpu aria-hidden="true" /><span>QUALIBLICK</span><strong>EN OPERACIÓN</strong></div>
            <div className="edge-node node-camera"><ScanLine aria-hidden="true" /><span>Captura</span></div>
            <div className="edge-node node-data"><Cpu aria-hidden="true" /><span>Modelo</span></div>
            <div className="edge-node node-action"><CircleGauge aria-hidden="true" /><span>Dato</span></div>
          </Reveal>
        </div>
      </section>

      <section id="resultados" className="validation-section section-space">
        <span id="validacion" className="anchor-alias" aria-hidden="true" />
        <div className="landing-container validation-grid">
          <Reveal className="validation-image">
            <Image src="/images/valdivia_lilies.jpg" alt="Planta de Valdivia Lilies, donde Qualiblick opera en condiciones reales" fill sizes="(max-width: 900px) 100vw, 50vw" />
            <div className="validation-image-overlay" />
            <div className="case-label"><MapPin aria-hidden="true" /> Valdivia, Chile</div>
            <div className="case-result"><strong>97,54%</strong><span>Precisión en conteo</span></div>
          </Reveal>

          <Reveal delay={0.1} className="validation-copy">
            <SectionLabel>Probado en condiciones reales</SectionLabel>
            <h2>Medir bien cuando el proceso no se detiene.</h2>
            <p>En Valdivia Lilies, Qualiblick ha medido productos con formas irregulares, en movimiento, superpuestos, con suciedad y a altos flujos. Son las condiciones donde un muestreo manual pierde representatividad más rápido.</p>
            <blockquote>“No buscamos reemplazar una muestra manual por una muestra digital. Buscamos aumentar la cantidad y la calidad de la información disponible para decidir.”</blockquote>
            <div className="validation-metrics">
              <div><strong>97,54%</strong><span>Precisión validada</span></div>
              <div><strong>+20 obj/s</strong><span>Alto flujo</span></div>
              <div><strong>24/7</strong><span>Operación continua</span></div>
            </div>
          </Reveal>
        </div>

        <div className="landing-container evidence-strip">
          <Reveal className="evidence-stat">
            <div className="trust-proof-stat">
              <strong>+100<span>M</span></strong>
              <span>ítems procesados</span>
            </div>
            <p>Mediciones acumuladas en operación, no en pruebas de laboratorio.</p>
          </Reveal>

          <Reveal delay={0.1} className="evidence-backers" aria-label="Organizaciones que respaldan a Qualiblick">
            <span className="backers-label">Respaldado por</span>
            <div className="backer-logos">
              <div className="backer-logo backer-logo-cgv">
                <Image src="/images/chile-global-ventures.png" alt="Chile Global Ventures" width={582} height={138} />
              </div>
              <div className="backer-logo backer-logo-corfo">
                <Image src="/images/corfo.png" alt="CORFO" width={740} height={216} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="por-que" className="impact-section section-space">
        <span id="impacto" className="anchor-alias" aria-hidden="true" />
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>Por qué Qualiblick</SectionLabel>
              <h2>Mejores datos <span>sin multiplicar soluciones.</span></h2>
            </Reveal>
          </div>

          <div className="impact-grid impact-grid-compact">
            {reasons.map(({ number, icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 0.06} className="impact-card">
                <div className="impact-card-top"><span>{number}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="vision-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Hacia dónde vamos</SectionLabel>
            <h2>De resolver un muestreo a entender toda la operación.</h2>
            <p>Hoy una empresa puede usar Qualiblick para resolver una medición específica. Mañana puede usar la misma plataforma para medir distintos puntos de su cadena productiva, desde el terreno hasta la planta.</p>
          </Reveal>
          <Reveal delay={0.12} className="vision-highlight">
            <p>Queremos construir la infraestructura de medición de la agroindustria.</p>
          </Reveal>
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <div className="cta-icon"><Sparkles aria-hidden="true" /></div>
            <h2>¿Qué estás midiendo hoy con una muestra?</h2>
            <p>Cuéntanos qué necesitas medir, cómo lo haces actualmente y qué decisión depende de ese resultado. Evaluaremos dónde tiene sentido aumentar la cobertura, estandarizar la medición y convertir ese proceso en información accionable.</p>
            <a href={demoHref} className="button button-primary button-large">
              Agenda una evaluación <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> {contactEmail}</span>
          </Reveal>
        </div>
      </section>

      <LandingFooter isHome />
    </main>
  );
}
