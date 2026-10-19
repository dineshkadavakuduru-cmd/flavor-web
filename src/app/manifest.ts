import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Served at /manifest.webmanifest. All URLs are relative on purpose: the
 * manifest then always describes whichever canonical host serves it, so an
 * install can never be pinned to the legacy `food` deployment.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#05060a",
    theme_color: "#05060a",
    categories: ["food", "education", "lifestyle"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
