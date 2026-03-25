import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vocabmaster.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/study/", "/profile", "/auth", "/teacher"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
