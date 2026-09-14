import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-void-950 font-grotesk text-bone antialiased">{children}</body>
    </html>
  );
}
