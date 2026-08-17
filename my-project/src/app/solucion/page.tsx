import type { Metadata } from "next";
import SolucionPage from "../../components/landing/SolucionPage";

const title = "La solución | Qualiblick";
const description =
  "Qualiblick es una plataforma configurable que aumenta la cobertura, consistencia y oportunidad de mediciones que hoy se realizan manualmente o sobre muestras pequeñas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.qualiblick.com/solucion" },
  openGraph: {
    title: "Convierte tus muestreos en sistemas de medición",
    description,
    url: "https://www.qualiblick.com/solucion",
    siteName: "Qualiblick",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Qualiblick: plataforma de medición configurable" }],
    locale: "es_CL",
    type: "website",
  },
};

export default function Page() {
  return <SolucionPage />;
}
