import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_HOST } from "@/lib/site";

/**
 * Collapse every production host onto the canonical origin.
 *
 * This repo is deployed by two Vercel projects (`flavor-web` = canonical,
 * legacy `food`). Because both build the same source, this middleware makes
 * whichever project a request lands on emit a permanent redirect to
 * flavor-web.vercel.app, so the legacy URL can never serve a second, duplicate
 * copy of the site to crawlers or users.
 *
 * Deliberately skipped:
 *  - local development (localhost / 127.0.0.1 / *.local)
 *  - non-production deployments (Vercel preview + development), so branch and
 *    preview URLs stay directly viewable
 *  - requests that are already on the canonical host
 */
export function middleware(request: NextRequest) {
  // VERCEL_ENV is "production" | "preview" | "development" on Vercel and
  // undefined locally. Only enforce canonical host on real production traffic.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host || host === CANONICAL_HOST) return NextResponse.next();

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost");
  if (isLocal) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Everything except Next internals and static assets, so redirects are cheap
  // and image/font requests are not bounced around.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|og-image.png|.*\\.(?:png|jpg|svg|webp|woff2?)$).*)"],
};
