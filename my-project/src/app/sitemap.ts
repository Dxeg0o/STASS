import type { MetadataRoute } from "next";
import { aplicaciones } from "../data/aplicaciones";

const BASE_URL = "https://www.qualiblick.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: BASE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/aplicaciones`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    ...aplicaciones.map((aplicacion) => ({
      url: `${BASE_URL}/aplicaciones/${aplicacion.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${BASE_URL}/sobre-nosotros`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
