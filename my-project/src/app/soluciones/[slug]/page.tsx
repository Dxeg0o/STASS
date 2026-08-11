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
  const url = `https://www.qualiblick.com/soluciones/${solucion.slug}`;
  const title = `${solucion.name} | Qualiblick`;
  const ogImage = solucion.mediaType === "image" ? solucion.mediaSrc : "/og.png";
  return {
    title,
    description: solucion.tagline,
    openGraph: {
      title,
      description: solucion.tagline,
      url,
      siteName: "Qualiblick",
      images: [
        {
          url: ogImage,
          alt: solucion.name,
        },
      ],
      locale: "es_CL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: solucion.tagline,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solucion = getSolucionBySlug(slug);
  if (!solucion) notFound();
  return <SolutionPage slug={slug} />;
}
