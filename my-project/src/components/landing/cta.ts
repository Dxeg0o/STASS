const CONTACT_EMAIL = "contacto@qualiblick.com";

const DEFAULT_BODY = `Hola equipo Qualiblick,

Me gustaría evaluar dónde tiene sentido medir en nuestra operación.

Empresa:
Qué necesitamos medir:
Cómo se mide hoy:
Qué decisión depende de ese dato:
Volumen aproximado:

Gracias.`;

export function buildDemoHref(subject?: string, body?: string) {
  const finalSubject = subject
    ? `Agenda una evaluación — ${subject}`
    : "Agenda una evaluación";
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(
    body ?? DEFAULT_BODY
  )}`;
}

export const demoHref = buildDemoHref();

export const contactEmail = CONTACT_EMAIL;

export const navLinks = [
  { label: "Solución", href: "/solucion" },
  { label: "Aplicaciones", href: "/aplicaciones" },
  { label: "Resultados", href: "/resultados" },
  { label: "Sobre nosotros", href: "/sobre-nosotros" },
] as const;
