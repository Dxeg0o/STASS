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

export type Aplicacion = {
  slug: string;
  contexto: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  captura: string;
  variables: string[];
  heroTitle: string;
  heroLead: string;
  mediaType: "image" | "video";
  mediaSrc: string;
  heroWide?: boolean;
  resultsMedia?: { src: string; alt: string };
  problem: { title: string; text: string };
  steps: { number: string; title: string; text: string }[];
  benefits: { icon: LucideIcon; title: string; text: string }[];
  proofPoint: string;
};

export const aplicaciones: Aplicacion[] = [
  {
    slug: "recepcion",
    contexto: "Recepción",
    icon: Boxes,
    title: "Qualiblick en recepción",
    summary:
      "Mide el producto que entra antes de moverlo, con una cobertura mucho mayor que una muestra manual.",
    captura: "Cámara fija en el punto de descarga",
    variables: ["Conteo", "Calibre", "Color", "Defectos"],
    heroTitle: "Mide lo que entra antes de decidir dónde va.",
    heroLead:
      "Configuramos Qualiblick en el punto de recepción para medir conteo, calibre, color y defectos sobre una cobertura mucho mayor que una muestra manual, con el mismo criterio en cada descarga.",
    mediaType: "image",
    mediaSrc: "/images/Qualiblick-Bin-Scan.png",
    heroWide: true,
    resultsMedia: {
      src: "/images/Qualiblick-Bin-Scan-RESULTS.png",
      alt: "Resultado de medición en recepción: color, tamaño y calidad del producto",
    },
    problem: {
      title: "Una muestra pequeña define el destino de todo lo que entró.",
      text: "En recepción se revisa una fracción mínima del volumen y ese resultado se usa para planificar, almacenar y negociar. Cuando la medición real aparece más adelante, ya no hay margen para corregir.",
    },
    steps: [
      { number: "01", title: "Captura en el punto de descarga", text: "Instalamos el equipo donde llega el producto, sin alterar el flujo de recepción ni agregar pasos al operador." },
      { number: "02", title: "Medición con criterio único", text: "Cada unidad medida se evalúa con el mismo criterio, turno tras turno y sin depender de quién esté a cargo." },
      { number: "03", title: "Resultado estructurado", text: "La medición queda organizada por lote, productor o período antes de mover el producto a línea, frío o venta." },
    ],
    benefits: [
      { icon: TrendingUp, title: "Mayor cobertura desde el inicio", text: "Muchas más unidades medidas que en un muestreo manual, con el mismo tiempo de operación." },
      { icon: PackageCheck, title: "Un criterio comparable", text: "Recepciones distintas se pueden comparar entre sí porque se midieron igual." },
      { icon: ShieldCheck, title: "Menos distancia entre entrada y salida", text: "El dato de recepción y el resultado final dejan de ser dos lecturas desconectadas." },
    ],
    proofPoint: "Metodología validada en planta: 97,54% de precisión en conteo sobre lotes reales.",
  },
  {
    slug: "proceso",
    contexto: "Línea de proceso",
    icon: ScanLine,
    title: "Qualiblick en línea de proceso",
    summary:
      "Medición continua sobre la línea activa, con criterios consistentes a alta velocidad.",
    captura: "Cámara fija o retrofit sobre equipos existentes",
    variables: ["Conteo", "Calibre", "Distribución", "Defectos"],
    heroTitle: "Medición continua sobre la línea que ya tienes.",
    heroLead:
      "Configuramos Qualiblick sobre la línea activa —en un punto nuevo o sobre un equipo existente— para medir de forma continua a alta velocidad, en lugar de revisar muestras puntuales entre turnos.",
    mediaType: "video",
    mediaSrc: "/videos/example.mp4",
    problem: {
      title: "Entre una revisión manual y la siguiente, nadie está midiendo.",
      text: "El control por muestreo revisa unidades aisladas cada cierto tiempo. La línea sigue produciendo con la misma desviación hasta la próxima revisión, y el resto del volumen queda sin medir.",
    },
    steps: [
      { number: "01", title: "Captura sobre la línea activa", text: "Definimos el punto donde el dato es más útil y montamos el equipo ahí, incluso sobre maquinaria que ya existe." },
      { number: "02", title: "Medición continua", text: "Cada unidad que pasa se mide y clasifica, a más de 20 objetos por segundo, sin frenar la producción." },
      { number: "03", title: "Datos segmentados", text: "La información se organiza por lote, turno o productor para poder actuar mientras la línea sigue corriendo." },
    ],
    benefits: [
      { icon: Zap, title: "Cobertura, no muestras", text: "Se mide el flujo completo del punto configurado, no una fracción revisada cada cierto tiempo." },
      { icon: Clock3, title: "Opera 24/7 sin fatiga", text: "El mismo criterio turno tras turno, sin la variabilidad de la inspección manual." },
      { icon: BarChart3, title: "Sobre la infraestructura existente", text: "Se integra al punto de la línea que ya tienes, sin rediseñar el proceso." },
    ],
    proofPoint: "97,54% de precisión validada en condiciones reales de alta velocidad y alto flujo.",
  },
  {
    slug: "terreno",
    contexto: "Terreno",
    icon: Handshake,
    title: "Qualiblick en terreno",
    summary:
      "Captura móvil en el predio para que las partes trabajen sobre la misma medición.",
    captura: "Equipo móvil o smartphone",
    variables: ["Conteo", "Calibre", "Distribución"],
    heroTitle: "Lleva la misma medición al predio.",
    heroLead:
      "Configuramos Qualiblick en modo móvil para medir en terreno con el mismo criterio que en planta, de modo que productor y comprador trabajen sobre una base común y comparable.",
    mediaType: "image",
    mediaSrc: "/images/valdivia_lilies.jpg",
    problem: {
      title: "En terreno, la estimación de una persona se vuelve el dato oficial.",
      text: "Sin una medición común y verificable, cada parte estima por su cuenta y alguien asume un riesgo que no eligió. Además, esos números no son comparables con lo que después se mide en planta.",
    },
    steps: [
      { number: "01", title: "Captura móvil en el predio", text: "El equipo se traslada al predio o al punto de recepción acordado, sin requerir infraestructura fija." },
      { number: "02", title: "Medición con el mismo criterio", text: "Se miden conteo, calibre y otras variables relevantes usando la misma configuración que en planta." },
      { number: "03", title: "Resultado compartido", text: "La medición queda disponible como base común antes de cerrar el acuerdo o programar la cosecha." },
    ],
    benefits: [
      { icon: ShieldCheck, title: "Una base común", text: "Ambas partes trabajan sobre la misma medición, no sobre dos estimaciones distintas." },
      { icon: TrendingUp, title: "Datos comparables con planta", text: "Lo medido en terreno se puede comparar con lo medido después en recepción o proceso." },
      { icon: MapPin, title: "Sin infraestructura fija", text: "Captura móvil, ajustable al predio, al producto y al momento de la temporada." },
    ],
    proofPoint: "Configuración en validación con productores y compradores: agenda una prueba en tu próxima temporada.",
  },
];

export function getAplicacionBySlug(slug: string) {
  return aplicaciones.find((aplicacion) => aplicacion.slug === slug);
}
