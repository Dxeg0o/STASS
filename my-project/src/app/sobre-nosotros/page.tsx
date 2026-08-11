import type { Metadata } from "next";
import AboutUs from "../../components/landing/AboutUs";

export const metadata: Metadata = {
  title: "Sobre nosotros | Qualiblick",
  description: "Conoce a Qualiblick, la tecnología que transforma la calidad de cada lote en decisiones agrícolas informadas.",
};

export default function AboutUsPage() {
  return <AboutUs />;
}
