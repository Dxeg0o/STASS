import {
  BarChart3,
  Boxes,
  Clock3,
  Handshake,
  MapPin,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Solucion = {
  slug: string;
  moment: string;
  icon: LucideIcon;
  name: string;
  descriptor: string;
  tagline: string;
  heroTitle: string;
  heroLead: string;
  mediaType: "image" | "video";
  mediaSrc: string;
  resultsMedia?: { src: string; alt: string };
  problem: { title: string; text: string };
  steps: { number: string; title: string; text: string }[];
  benefits: { icon: LucideIcon; title: string; text: string }[];
  proofPoint: string;
  ctaSubject: string;
};

export const soluciones: Solucion[] = [
  {
    slug: "guigna",
    moment: "Recepción",
    icon: Boxes,
    name: "GUIGNA®",
    descriptor: "Diagnóstico de recepción",
    tagline: "Conoce la composición de cada bin antes de procesarlo.",
    heroTitle: "Conoce lo que tienes antes de procesarlo.",
    heroLead:
      "Mide calibre, color y calidad al recibir cada bin para decidir su mejor destino con datos reales.",
    mediaType: "image",
    mediaSrc: "/images/Qualiblick-Bin-Scan.png",
    resultsMedia: {
      src: "/images/Qualiblick-Bin-Scan-RESULTS.png",
      alt: "Resultado de análisis de bins: color, tamaño y calidad de manzanas",
    },
    problem: {
      title: "Una muestra pequeña decide el destino de todo el lote.",
      text: "Sin un dato representativo en recepción, ventas, almacenamiento y planificación de empaque operan a ciegas hasta la calibración final, cuando ya no hay margen de acción.",
    },
    steps: [
      { number: "01", title: "Cámara en el punto de recepción", text: "Se posiciona un equipo Qualiblick donde llegan los bins, sin alterar el flujo de recepción." },
      { number: "02", title: "Medición del lote completo", text: "El sistema mide calibre, color y defectos de cada bin en minutos, con criterios consistentes." },
      { number: "03", title: "Perfil comercial disponible", text: "El resultado queda listo antes de enviar el producto a línea, cámara de frío o venta directa." },
    ],
    benefits: [
      { icon: TrendingUp, title: "Vende antes, con datos reales", text: "Ofrece tu inventario con conocimiento real de calibre y calidad, no con una estimación." },
      { icon: PackageCheck, title: "Dirige cada bin al destino correcto", text: "Venta inmediata, guarda o reproceso: decide con el perfil completo del lote a la vista." },
      { icon: ShieldCheck, title: "Menos sorpresas en calibración final", text: "El dato de recepción y el de salida dejan de estar tan separados en el tiempo." },
    ],
    proofPoint: "Metodología validada en planta: 97,54% de precisión en conteo sobre lotes reales.",
    ctaSubject: "GUIGNA",
  },
  {
    slug: "plancus",
    moment: "Proceso",
    icon: ScanLine,
    name: "PLANCUS®",
    descriptor: "Control de línea en tiempo real",
    tagline: "Mide cada lote mientras la producción avanza.",
    heroTitle: "Ve lo que pasa en tu línea mientras está pasando.",
    heroLead:
      "Mide calibre y calidad en vivo sobre la línea activa para detectar desviaciones antes de que avancen.",
    mediaType: "video",
    mediaSrc: "/videos/example.mp4",
    problem: {
      title: "Para cuando el problema es visible, ya está empacado.",
      text: "El control de calidad tradicional revisa muestras puntuales. Entre una revisión y otra, la línea sigue produciendo con la misma desviación sin que nadie intervenga.",
    },
    steps: [
      { number: "01", title: "Cámaras sobre la línea activa", text: "Se instalan en el punto del proceso donde el dato es más útil, sin frenar la producción." },
      { number: "02", title: "Medición continua a alta velocidad", text: "Cada unidad se mide y clasifica en tiempo real, a más de 20 objetos por segundo." },
      { number: "03", title: "Datos segmentados para decidir ahora", text: "La información se organiza por lote, turno o productor para actuar mientras la línea sigue corriendo." },
    ],
    benefits: [
      { icon: Zap, title: "Detecta desviaciones a tiempo", text: "Antes de que lleguen al empaque final y se conviertan en reproceso o reclamo." },
      { icon: Clock3, title: "Opera 24/7 sin fatiga", text: "Criterios consistentes turno tras turno, sin la variabilidad de la inspección manual." },
      { icon: BarChart3, title: "Sin infraestructura compleja", text: "Se integra al punto de la línea que ya tienes, sin rediseñar el proceso." },
    ],
    proofPoint: "97,54% de precisión validada en condiciones reales de alta velocidad (caso Valdivia Lilies).",
    ctaSubject: "PLANCUS",
  },
  {
    slug: "culpaeus",
    moment: "Terreno",
    icon: Handshake,
    name: "CULPAEUS®",
    descriptor: "Tasación objetiva en terreno",
    tagline: "Conoce el potencial comercial antes de decidir.",
    heroTitle: "Negocia con datos, no con estimaciones.",
    heroLead:
      "Lleva una medición objetiva al predio para que productor y comprador decidan sobre la misma evidencia.",
    mediaType: "image",
    mediaSrc: "/images/valdivia_lilies.jpg",
    problem: {
      title: "Alguien siempre asume un riesgo que no eligió.",
      text: "Sin un dato común y verificable, una de las dos partes de la negociación termina apostando a que el resultado del empaque coincida con lo que se acordó en el predio.",
    },
    steps: [
      { number: "01", title: "Despliegue móvil al predio", text: "Un equipo Qualiblick se traslada al predio o punto de recepción acordado por ambas partes." },
      { number: "02", title: "Medición en terreno", text: "Se mide conteo, calibre y otras variables relevantes sobre una muestra representativa del lote." },
      { number: "03", title: "Informe objetivo y compartido", text: "El resultado queda disponible antes de cerrar la negociación, como base común para ambas partes." },
    ],
    benefits: [
      { icon: ShieldCheck, title: "Reduce el riesgo para ambas partes", text: "Productor y comprador negocian sobre el mismo dato, no sobre supuestos distintos." },
      { icon: TrendingUp, title: "Acelera el cierre del acuerdo", text: "Una base de información común simplifica la conversación de precio." },
      { icon: MapPin, title: "Se adapta a distintos cultivos", text: "Servicio móvil, sin infraestructura fija, ajustable al predio y al producto." },
    ],
    proofPoint: "Servicio en validación con productores y compradores: agenda una prueba en tu próxima cosecha.",
    ctaSubject: "CULPAEUS",
  },
];

export function getSolucionBySlug(slug: string) {
  return soluciones.find((solucion) => solucion.slug === slug);
}
