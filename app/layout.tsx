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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  title: "GuitarHub — Learn Guitar, One Step at a Time",
  description:
    "Start with free guitar lessons, tuning preparation, and guided practice. Save progress in your browser and explore guitar and voice learning paths.",
  openGraph: {
    title: "GuitarHub — Learn Guitar, One Step at a Time",
    description:
      "Get comfortable, tune up, and practice your first sounds. Three opening lessons free, with progress saved in your browser.",
    url: "https://guitarhub.org",
    siteName: "GuitarHub",
    type: "website",
  },
  alternates: { canonical: "https://guitarhub.org" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// GuitarHub was the only Suede property emitting no structured data, so engines
// had nothing tying it to Suede Labs. These reference the canonical
// Organization and Person @ids used across the estate rather than minting
// duplicate nodes for the same entities. Google resolves @id within a single
// page, so the referenced nodes are defined here too.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://guitarhub.org/#website",
      url: "https://guitarhub.org",
      name: "GuitarHub",
      description:
        "Guitar and voice learning paths, guided practice, and browser tools from Suede Labs.",
      inLanguage: "en-US",
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    {
      "@type": "Organization",
      "@id": SUEDE_ORG_ID,
      // Music-facing surface: no trailing "AI" on the display name. The AI
      // forms stay in alternateName so the entity still reconciles with
      // suedeai.ai and the rest of the estate.
      name: "Suede Labs",
      alternateName: ["Suede Labs AI", "Suede AI", "Suede"],
      url: "https://suedeai.ai",
      logo: "https://suedeai.ai/suede-ai-logo-transparent.png",
      founder: { "@id": JASON_PERSON_ID },
      sameAs: [
        "https://suedeai.org/",
        "https://x.com/AISUEDE",
        "https://github.com/Suede-AI",
        "https://www.youtube.com/@aisuede",
        "https://www.instagram.com/suedeai/",
        "https://www.facebook.com/people/Suede-Labs-AI/61584534847516",
        "https://t.me/SUEDEAI",
        "https://linktr.ee/suedelabsai",
        "https://www.crunchbase.com/organization/suede-labs-ai",
        "https://www.linkedin.com/company/suede-labs",
        "https://www.wikidata.org/wiki/Q141169484",
      ],
    },
    {
      "@type": "Person",
      "@id": JASON_PERSON_ID,
      name: "Jason Colapietro",
      alternateName: ["Johnny Suede"],
      jobTitle: "Founder and CEO of Suede Labs",
      url: "https://suedeai.ai/founder",
      worksFor: { "@id": SUEDE_ORG_ID },
      sameAs: [
        "https://www.linkedin.com/in/jasoncolapietro",
        "https://x.com/johnnysuede",
        "https://github.com/JasonColapietro",
        "https://www.wikidata.org/wiki/Q140235755",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Apply the enhancement class after hydration so React and the
            initial HTML agree. No-JS readers still receive visible content. */}
        <JsClassMarker />
        {children}
      </body>
    </html>
  );
}
