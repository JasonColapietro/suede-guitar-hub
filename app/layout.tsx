import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import JsClassMarker from "@/components/JsClassMarker";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://guitarhub.org"),
  title: "GuitarHub — Prove One Guitar Breakthrough in 30 Days",
  description:
    "Build a four-week guitar practice plan, launch the right Strumly tools, track weekly evidence in your browser, and apply to the GuitarHub founding room.",
  openGraph: {
    title: "GuitarHub — Prove One Guitar Breakthrough in 30 Days",
    description:
      "One finish line, four weeks of focused practice, and evidence instead of lesson collecting.",
    url: "https://guitarhub.org",
    siteName: "GuitarHub",
    type: "website",
  },
  alternates: { canonical: "https://guitarhub.org" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {/* Apply the enhancement class after hydration so React and the
            initial HTML agree. No-JS readers still receive visible content. */}
        <JsClassMarker />
        {children}
      </body>
    </html>
  );
}
