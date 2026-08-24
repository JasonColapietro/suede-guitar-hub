import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
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
  title: "GuitarHub — A structured path to real guitar mastery",
  description:
    "GuitarHub is a mentorship-driven guitar accelerator by Suede Labs: a structured curriculum, daily feedback, and practice software that compounds — apply to join the next cohort.",
  openGraph: {
    title: "GuitarHub — A structured path to real guitar mastery",
    description:
      "Mentorship-driven guitar accelerator: structured curriculum, daily feedback, practice software that compounds.",
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
      <body>{children}</body>
    </html>
  );
}
