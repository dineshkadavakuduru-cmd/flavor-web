/**
 * Single source of truth for the canonical site origin.
 *
 * Deployment reality: this repo is deployed twice on Vercel. `flavor-web` is
 * canonical; the legacy `food` project must never be the URL that gets indexed,
 * shared or installed. Everything that embeds an absolute URL (metadata /
 * canonical tag / OG image / sitemap / robots / manifest) reads it from here,
 * and `middleware.ts` redirects every other production host to it.
 *
 * Override with NEXT_PUBLIC_SITE_URL (e.g. when moving to a custom domain).
 */
const FALLBACK_ORIGIN = "https://flavor-web.vercel.app";

function resolveOrigin(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.includes("://") ? raw : `https://${raw}`);
    } catch {
      // fall through to the fallback below
    }
  }
  return new URL(FALLBACK_ORIGIN);
}

const origin = resolveOrigin();

/** Canonical origin without a trailing slash, e.g. `https://flavor-web.vercel.app`. */
export const SITE_URL = origin.origin;

/** Canonical host, e.g. `flavor-web.vercel.app` (used by the redirect middleware). */
export const CANONICAL_HOST = origin.host.toLowerCase();

export const SITE_NAME = "Flavor Web";
export const SITE_TITLE = "Flavor Web — 3D Ingredient Pairing Explorer";
export const SITE_DESCRIPTION =
  "A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;

/** Absolute URL for a path on the canonical origin. */
export function siteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
