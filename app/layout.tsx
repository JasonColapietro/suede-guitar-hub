import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { APP_STORE } from "@/lib/site";
import JsClassMarker from "@/components/JsClassMarker";
import { keywordsFor } from "@/lib/keywords";
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
  keywords: keywordsFor("/"),
  metadataBase: new URL("https://guitarhub.org"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  title: "Guitar Lessons & Practice Tools | GuitarHub by Suede AI",
  description:
    "Explore guitar lessons with lifetime access, plus free practice routines and advanced drills. GuitarHub by Suede AI keeps web progress in your browser.",
  openGraph: {
    title: "Guitar Lessons & Practice Tools | GuitarHub by Suede AI",
    description:
      "Explore guitar lessons with lifetime access, plus free practice routines and advanced drills. GuitarHub by Suede AI keeps web progress in your browser.",
    url: "https://guitarhub.org",
    siteName: "GuitarHub",
    type: "website",
  },
  // No `alternates.canonical` here. A layout's canonical is inherited by every
  // page that does not set its own, so the 404 page and the noindexed
  // /learn/voice/materials and /learn/voice/recordings all declared the home
  // page as their canonical. Each indexable page sets its own self canonical
  // (the home page included, in app/page.tsx).
  // Renders <meta name="apple-itunes-app">: Safari on iOS shows the Smart App
  // Banner above every page, which is the one install path that needs no
  // App Store search at all.
  itunes: { appId: APP_STORE.appId },
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
        "Guitar lessons, practice routines, and advanced drills from Suede AI.",
      inLanguage: "en-US",
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    {
      "@type": "Organization",
      "@id": SUEDE_ORG_ID,
      // Must be the canonical "Suede AI". The music-facing rule that used
      // to sit here does not survive the shared @id: this node carries the same
      // @id as the one suedeai.ai publishes, and nodes sharing an @id are the
      // same resource whose properties merge, so a second `name` is a
      // conflicting label on one entity rather than a softer display name for
      // this surface. The short forms keep working as alternateName.
      name: "Suede AI",
      alternateName: ["Suede Labs", "Suede"],
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
        "https://www.linkedin.com/company/suede-labs",
        "https://www.wikidata.org/wiki/Q141169484",
      ],
    },
    {
      // The native iOS app. `name` is the exact App Store listing title —
      // Google cross-checks SoftwareApplication schema against the store, so
      // the store wins over the division name, which rides in alternateName.
      "@type": "MobileApplication",
      "@id": "https://guitarhub.org/#ios-app",
      name: APP_STORE.name,
      alternateName: ["GuitarHub", "GuitarHub by Suede AI"],
      description:
        "Guided beginner guitar lessons with a free daily practice routine, chord-change drills, tuner, metronome and vocal range finder.",
      applicationCategory: "MusicApplication",
      operatingSystem: "iOS",
      url: APP_STORE.ios,
      installUrl: APP_STORE.ios,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      isPartOf: { "@id": "https://guitarhub.org/#website" },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    {
      "@type": "Person",
      "@id": JASON_PERSON_ID,
      name: "Jason Colapietro",
      alternateName: ["Johnny Suede"],
      jobTitle: ["Founder and CEO, Suede AI", "Fractional Forward-Deployed Engineer"],
      knowsAbout: [
        "AI integration",
        "Forward-deployed engineering",
        "AI agents",
        "Search engine optimization",
        "Generative engine optimization",
        "Answer engine optimization",
        "Digital PR",
      ],
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
      <nav aria-label="Site reference" style={{ padding: "1rem", textAlign: "center", fontSize: "0.875rem" }}><a href="/ai-instructions">AI Instructions</a></nav>
      </body>
    </html>
  );
}
