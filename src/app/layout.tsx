import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
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
  title: "Flavor Web — 3D Ingredient Pairing Explorer",
  description:
    "A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.",
  metadataBase: new URL("https://food-jet-delta.vercel.app"),
  openGraph: {
    title: "Flavor Web — 3D Ingredient Pairing Explorer",
    description:
      "A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.",
    url: "https://food-jet-delta.vercel.app",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Flavor Web — 3D Ingredient Pairing Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flavor Web — 3D Ingredient Pairing Explorer",
    description:
      "A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.",
    images: ["/og-image.png"],
  },
};

// next/font marks these Space Grotesk (font-grotesk) latin woff2 files with the
// ".p." (preload) suffix, but Next 14 doesn't emit <link rel="preload"> tags in
// the static HTML shell. Preload them explicitly so the primary font doesn't
// arrive late and cause a FOUT. Hashes change only if the Google font version
// changes — keep in sync with .next/static/media (see @font-face in built CSS).
const FONT_GROTESK_PRELOADS = [
  "/_next/static/media/36966cca54120369-s.p.woff2",
  "/_next/static/media/558ca1a6aa3cb55e-s.p.woff2",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-void-950 font-grotesk text-bone antialiased">
        {FONT_GROTESK_PRELOADS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        {children}
      </body>
    </html>
  );
}
