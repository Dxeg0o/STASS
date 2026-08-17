import { notFound } from "next/navigation";
import AplicacionPage from "../../../components/landing/AplicacionPage";
import { aplicaciones, getAplicacionBySlug } from "../../../data/aplicaciones";

export function generateStaticParams() {
  return aplicaciones.map((aplicacion) => ({ slug: aplicacion.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const aplicacion = getAplicacionBySlug(slug);
  if (!aplicacion) return {};
  const url = `https://www.qualiblick.com/aplicaciones/${aplicacion.slug}`;
  const title = `${aplicacion.metaTitle} | Qualiblick`;
  const description = aplicacion.metaDescription;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: aplicacion.heroTitle,
      description,
      url,
      siteName: "Qualiblick",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: aplicacion.eyebrow }],
      locale: "es_CL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const aplicacion = getAplicacionBySlug(slug);
  if (!aplicacion) notFound();
  return <AplicacionPage slug={slug} />;
}
