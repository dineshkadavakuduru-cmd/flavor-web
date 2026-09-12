import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flavor Web — 3D Ingredient Pairing Explorer",
  description:
    "A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void-950 font-grotesk text-bone antialiased">{children}</body>
    </html>
  );
}
