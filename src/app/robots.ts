import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Generated instead of a static public/robots.txt so the sitemap and host
 * always point at the canonical origin (see src/lib/site.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
