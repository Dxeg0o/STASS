import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/register", "/reset-password", "/forgot-password", "/select-empresa", "/registro-invitacion", "/app/", "/admin/", "/api/", "/demo/"],
    },
    sitemap: "https://www.qualiblick.com/sitemap.xml",
  };
}
