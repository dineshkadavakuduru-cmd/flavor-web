import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import {
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Everything relative below resolves against the canonical origin, so
  // canonical/OG URLs can never point at the legacy deployment.
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Page zoom is deliberately left enabled (WCAG 1.4.4). The canvas keeps its
  // own gestures via `touch-action: none`, so pinch on the header/panels still
  // zooms text for low-vision users.
};

// Next 14.2 does not emit <link rel="preload"> for next/font in the static HTML
// shell, so the display font arrives late and causes a FOUT. This is the Space
// Grotesk file next/font marks with the ".p." suffix in .next/static/media.
//
// A previous revision also preloaded "/_next/static/media/558ca1a6aa3cb55e-s.p.woff2".
// That file does not exist — 558ca1a6aa3cb55e is a JetBrains Mono file (which is
// deliberately preload:false here) and it only exists without the ".p." suffix,
// so the previous name 404'd on every page load. The hash changes if the Google
// Font version changes; `npm run audit:browser` now asserts that every font URL
// the shell references actually resolves.
const FONT_GROTESK_PRELOAD = "/_next/static/media/36966cca54120369-s.p.woff2";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-void-950 font-grotesk text-bone antialiased">
        <link
          rel="preload"
          href={FONT_GROTESK_PRELOAD}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}
