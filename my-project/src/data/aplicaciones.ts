import { Boxes, ScanLine, Sprout, type LucideIcon } from "lucide-react";

export type DetailBlock = {
  title: string;
  text?: string;
  items?: string[];
};

export type Aplicacion = {
  slug: string;
  contexto: string;
  icon: LucideIcon;
  /** Titular corto para las tarjetas de home y del índice. */
  cardHeadline: string;
  cardText: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroLead: string[];
  mediaType: "image" | "video";
  mediaSrc: string;
  heroWide?: boolean;
  variablesNote?: string;
  variables: string[];
  blocks: DetailBlock[];
  techCards?: { title: string; text: string }[];
  showMetrics?: boolean;
  next?: { slug: string; label: string };
  ctaTitle: string;
  ctaText: string;
};

export const aplicaciones: Aplicacion[] = [
  {
    slug: "terreno",
    contexto: "Terreno",
    icon: Sprout,
    cardHeadline: "Mide antes de que el producto llegue a planta.",
    cardText:
      "Obtén más información directamente en el predio para mejorar estimaciones, planificación y decisiones previas a cosecha.",
    eyebrow: "Qualiblick en terreno",
    metaTitle: "Medición en terreno",
    metaDescription:
      "Configura Qualiblick para medir conteo, calibre y distribución directamente en el predio, con mayor cobertura y un criterio consistente, antes de cosechar, comprar o planificar.",
    heroTitle: "Mide antes de que el producto llegue a planta.",
    heroLead: [
      "Muchas decisiones en campo todavía dependen de recorridos, conteos manuales y pequeñas muestras.",
      "Qualiblick permite aumentar la cobertura y aplicar criterios consistentes directamente en terreno.",
    ],
    mediaType: "image",
    mediaSrc: "/images/valdivia_lilies.jpg",
    variablesNote: "Según la operación:",
    variables: ["Conteo", "Calibre", "Distribución", "Densidad", "Posición", "Otras variables"],
    blocks: [
      {
        title: "La captura se adapta al terreno.",
        text: "Podemos configurar Qualiblick utilizando dispositivos móviles, cámaras instaladas sobre maquinaria u otras formas de captura según las condiciones reales del predio.",
      },
      {
        title: "Información para decidir antes.",
        text: "Los datos pueden utilizarse para:",
        items: [
          "estimaciones",
          "planificación",
          "comparación entre sectores",
          "evaluación previa a cosecha",
          "control de labores",
        ],
      },
      {
        title: "Del terreno a la planta.",
        text: "La medición en campo puede ser el primer punto de una misma infraestructura que después continúa en recepción y proceso.",
      },
    ],
    next: { slug: "recepcion", label: "Ver Qualiblick en recepción" },
    ctaTitle: "¿Qué estás estimando hoy con un recorrido?",
    ctaText: "Cuéntanos qué mides en terreno y qué decisión depende de ese resultado.",
  },
  {
    slug: "recepcion",
    contexto: "Recepción",
    icon: Boxes,
    cardHeadline: "Conoce mejor lo que está entrando.",
    cardText:
      "Aumenta la información disponible sobre cada lote antes de decidir su destino, proceso o almacenamiento.",
    eyebrow: "Qualiblick en recepción",
    metaTitle: "Medición en recepción",
    metaDescription:
      "Configura Qualiblick para medir cada lote que entra —conteo, calibre, color, defectos y distribución— antes de decidir su destino, proceso, almacenamiento o venta.",
    heroTitle: "Conoce mejor lo que está entrando antes de decidir su destino.",
    heroLead: [
      "Un lote completo puede terminar caracterizado a partir de una pequeña muestra.",
      "Qualiblick aumenta la cobertura de medición antes de que el producto avance hacia proceso, frío, almacenamiento o venta.",
    ],
    mediaType: "image",
    mediaSrc: "/images/Qualiblick-Bin-Scan.png",
    heroWide: true,
    variables: ["Conteo", "Calibre", "Color", "Defectos", "Distribución"],
    blocks: [
      {
        title: "Entiende cómo está compuesto cada lote.",
        text: "En vez de quedarte únicamente con un promedio, puedes observar cómo se distribuye el producto entre distintos calibres, colores, categorías u otras variables.",
      },
      {
        title: "Usa el dato cuando todavía puedes decidir.",
        text: "La información puede respaldar decisiones de:",
        items: ["destino", "proceso", "segregación", "almacenamiento", "planificación", "comercialización"],
      },
      {
        title: "Integrado al flujo existente.",
        text: "Qualiblick puede utilizar cámaras fijas, estaciones de medición o retrofit sobre equipos existentes según cómo se mueve el producto dentro de tu operación.",
      },
      {
        title: "Recepción puede ser solo el comienzo.",
        text: "La misma plataforma puede continuar midiendo después durante el proceso.",
      },
    ],
    next: { slug: "proceso", label: "Ver Qualiblick en proceso" },
    ctaTitle: "¿Qué estás midiendo hoy con una muestra?",
    ctaText: "Cuéntanos qué revisas en recepción y qué decisión depende de ese resultado.",
  },
  {
    slug: "proceso",
    contexto: "Línea de proceso",
    icon: ScanLine,
    cardHeadline: "Mide mientras la operación está ocurriendo.",
    cardText:
      "Integra Qualiblick sobre equipos y líneas existentes para observar continuamente lo que está pasando.",
    eyebrow: "Qualiblick en proceso",
    metaTitle: "Medición en línea de proceso",
    metaDescription:
      "Integra Qualiblick sobre líneas y equipos existentes para medir de forma continua a alta velocidad, con 97,54% de precisión validada en conteo y operación 24/7.",
    heroTitle: "Mide mientras el proceso está ocurriendo.",
    heroLead: [
      "Entre una muestra y otra pueden pasar miles de unidades.",
      "Qualiblick integra medición automatizada sobre líneas y equipos existentes para aumentar la cobertura y entender cómo cambia el proceso a lo largo del tiempo.",
    ],
    mediaType: "video",
    mediaSrc: "/videos/example.mp4",
    variables: ["Conteo", "Calibre", "Color", "Defectos", "Distribución"],
    blocks: [
      {
        title: "Retrofit sobre tu operación existente.",
        text: "Cuando las condiciones lo permiten, instalamos Qualiblick sobre maquinaria que ya forma parte de tu proceso. No necesitas reemplazar una línea completa para comenzar a medir.",
      },
      {
        title: "Convierte el flujo en datos.",
        text: "Los resultados pueden estructurarse por:",
        items: ["lote", "turno", "período", "proceso", "punto de medición", "categoría"],
      },
    ],
    techCards: [
      { title: "Procesamiento local", text: "Análisis directamente en la instalación." },
      { title: "Operación continua", text: "La medición acompaña el flujo productivo." },
      { title: "Conectividad limitada", text: "El sistema puede continuar operando aunque internet sea inestable." },
    ],
    showMetrics: true,
    ctaTitle: "¿Qué estás controlando hoy con una muestra?",
    ctaText: "Cuéntanos qué variable revisas y qué decisión depende de ese resultado.",
  },
];

export function getAplicacionBySlug(slug: string) {
  return aplicaciones.find((aplicacion) => aplicacion.slug === slug);
}

export const metrics = [
  { value: "97,54%", label: "Precisión validada en conteo" },
  { value: "+20 obj/s", label: "Alto flujo" },
  { value: "24/7", label: "Operación continua" },
  { value: "+100M", label: "Ítems procesados" },
];
