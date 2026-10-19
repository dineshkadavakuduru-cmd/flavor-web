import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The app is a single client-rendered route, so there is exactly one URL.
 * Generated rather than static so it can never drift from the canonical origin.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
