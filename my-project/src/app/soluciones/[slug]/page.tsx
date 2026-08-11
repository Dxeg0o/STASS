import { notFound } from "next/navigation";
import SolutionPage from "../../../components/landing/SolutionPage";
import { getSolucionBySlug, soluciones } from "../../../data/soluciones";

export function generateStaticParams() {
  return soluciones.map((solucion) => ({ slug: solucion.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solucion = getSolucionBySlug(slug);
  if (!solucion) return {};
  return {
    title: `${solucion.name} | Qualiblick`,
    description: solucion.tagline,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solucion = getSolucionBySlug(slug);
  if (!solucion) notFound();
  return <SolutionPage slug={slug} />;
}
