import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { crumbTrail } from "@/lib/breadcrumbs";
import { pageJsonLd } from "@/lib/page-schema";
import { keywordsFor } from "@/lib/keywords";
import { OFFER, lifetimeOfferAt } from "@/lib/site";

const description = "Terms for using GuitarHub: the free module and tools, lifetime access bought once on the web or iPhone, the 90-day guarantee, local records, and support.";
export const metadata: Metadata = {
  keywords: keywordsFor("/terms"),
  title: "Terms of Use | GuitarHub",
  description,
  alternates: { canonical: "https://guitarhub.org/terms" },
  openGraph: {
    title: "Terms of Use | GuitarHub",
    description,
    url: "https://guitarhub.org/terms",
    siteName: "GuitarHub",
    type: "website",
    images: [
      {
        url: "https://guitarhub.org/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GuitarHub guitar and voice learning tools",
      },
    ],
  },
};

const CANONICAL = "https://guitarhub.org/terms";
const CRUMBS = crumbTrail("Terms of Use", "/terms");
const JSON_LD = pageJsonLd({ canonical: CANONICAL, name: "Terms of Use | GuitarHub", description, crumbs: CRUMBS });

export default function TermsPage() {
  // A static page: it states the offer in force when it is built.
  const offer = lifetimeOfferAt(new Date());
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
    <Article crumbs={CRUMBS} eyebrow="GuitarHub" title="Terms of Use" dek="Using the lessons, practice tools, and purchased access." updated="2026-11-10" showPracticeCallToAction={false}>
      <p>These terms cover guitarhub.org and the GuitarHub app, provided by Suede AI. You may use the learning content and tools for your own practice. For help, contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.</p>

      <h2>Learning and practice</h2>
      <p>Lessons, timers, and practice suggestions support your learning. A timer finishing records time; it does not certify technique. Microphone feedback estimates the sound it receives and can be affected by noise, instrument setup, and your device. Scores and self-checks are practice feedback, not professional qualifications or a promise of a particular result.</p>
      <p>Use comfortable volume and practice within your physical limits. Pause if playing or singing causes pain. Adjust suggested practice time and speed to your needs.</p>

      <h2>Content and external links</h2>
      <p>GuitarHub’s original lessons, diagrams, studies, software, and design remain the property of their respective rights holders. Using the service does not give you permission to resell the content or redistribute a copy of the app. Any open-source component remains subject to its own license.</p>
      <p>External lessons, songs, and tools belong to their respective providers. A link does not include a license to their media, a paid subscription, or a guarantee that the external material will remain available. GuitarHub is an independent product and is not affiliated with Yousician, JustinGuitar, or Sonora Guitar Intensive.</p>

      <h2>Lifetime access</h2>
      <p>Lifetime access is a one-time purchase of {offer.oneTime}, and it does not renew.{offer.launchNote ? ` ${offer.launchNote}` : ""} Buy it on guitarhub.org through Stripe Checkout, with sales tax added at checkout where it applies, or in the GuitarHub iPhone app through the App Store, which shows the product, price, and payment terms before you confirm. Any legacy subscription remains governed by the terms accepted when it was purchased and can be managed in your Apple account settings.</p>
      <p>One purchase covers guitarhub.org and the GuitarHub iPhone app when you sign in to both with the same email. A web purchase opens lessons for an account signed in with the email used at checkout. An App Store purchase links to your account when you sign in on iPhone, and one Apple purchase links to one account. Use Restore Purchases in the iOS app to restore eligible access with the Apple account that bought it.</p>

      <h2>The 90-day guarantee</h2>
      <p>{OFFER.guarantee} The guarantee covers lifetime access bought on guitarhub.org. To ask for the refund, email <a href="mailto:info@suedeai.ai">info@suedeai.ai</a> from the address on your receipt, and the refund goes back to your original payment method. A refund ends lifetime access on guitarhub.org and in the iPhone app.</p>
      <p>Apple handles billing and refund requests for purchases made in the iPhone app, and an Apple refund or revocation ends access the same way.</p>
      <p>The iOS app is also subject to the license terms shown with its App Store listing, including <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Apple’s standard Licensed Application End User License Agreement</a> where applicable. These website terms do not remove rights provided by applicable consumer law or your purchase terms.</p>

      <h2>Local records and availability</h2>
      <p>Practice records are stored on your device unless you sign in and turn on practice sync. Clearing browser data, deleting app data, or changing devices can remove them. Use an export feature where one is available if you want a separate copy. Features and external links may change as the service is maintained; the currently available lesson content and access are described in the app or on the relevant page.</p>
      <p>Our <Link href="/privacy">Privacy Policy</Link> explains microphone processing, local records, accounts, purchases, email, hosting, and messages. Contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a> for support or questions about these terms.</p>
    </Article>
    </>
  );
}
