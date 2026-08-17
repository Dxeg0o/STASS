import type { Metadata } from "next";
import ResultadosPage from "../../components/landing/ResultadosPage";

const title = "Resultados | Qualiblick";
const description =
  "Qualiblick opera en procesos agroindustriales con movimiento, superposición, suciedad y altos flujos: 97,54% de precisión validada en conteo y más de 100 millones de ítems procesados.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.qualiblick.com/resultados" },
  openGraph: {
    title: "Tecnología probada en operación real",
    description,
    url: "https://www.qualiblick.com/resultados",
    siteName: "Qualiblick",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Resultados de Qualiblick en operación real" }],
    locale: "es_CL",
    type: "website",
  },
};

export default function Page() {
  return <ResultadosPage />;
}
