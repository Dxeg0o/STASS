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
  { label: "Solución", hash: "#solucion" },
  { label: "Cómo funciona", hash: "#como-funciona" },
  { label: "Aplicaciones", hash: "#aplicaciones" },
  { label: "Resultados", hash: "#resultados" },
] as const;

export const footerLinks = [
  { label: "Solución", hash: "#solucion" },
  { label: "Cómo funciona", hash: "#como-funciona" },
  { label: "Aplicaciones", hash: "#aplicaciones" },
  { label: "Tecnología", hash: "#tecnologia" },
  { label: "Resultados", hash: "#resultados" },
] as const;
