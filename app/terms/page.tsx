import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";

const description = "Terms for using GuitarHub’s learning tools, lesson content, App Store access, and support.";
export const metadata: Metadata = {
  title: "Terms of Use | GuitarHub",
  description,
  alternates: { canonical: "https://guitarhub.org/terms" },
  openGraph: { title: "Terms of Use | GuitarHub", description, url: "https://guitarhub.org/terms", type: "website" },
};

export default function TermsPage() {
  return (
    <Article eyebrow="GuitarHub" title="Terms of Use" dek="Using the lessons, practice tools, and purchased access." updated="2026-09-04" showPracticeCallToAction={false}>
      <p>These terms cover guitarhub.org and the GuitarHub app, provided by Suede Labs. You may use the learning content and tools for your own practice. For help, contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.</p>

      <h2>Learning and practice</h2>
      <p>Lessons, timers, and practice suggestions support your learning. A timer finishing records time; it does not certify technique. Microphone feedback estimates the sound it receives and can be affected by noise, instrument setup, and your device. Scores and self-checks are practice feedback, not professional qualifications or a promise of a particular result.</p>
      <p>Use comfortable volume and practice within your physical limits. Pause if playing or singing causes pain. Adjust suggested practice time and speed to your needs.</p>

      <h2>Content and external links</h2>
      <p>GuitarHub’s original lessons, diagrams, studies, software, and design remain the property of their respective rights holders. Using the service does not give you permission to resell the content or redistribute a copy of the app. Any open-source component remains subject to its own license.</p>
      <p>External lessons, songs, and tools belong to their respective providers. A link does not include a license to their media, a paid subscription, or a guarantee that the external material will remain available. GuitarHub is an independent product and is not affiliated with Yousician, JustinGuitar, or Sonora Guitar Intensive.</p>

      <h2>App Store purchases and access</h2>
      <p>The App Store purchase screen shows the product, price, and payment terms before you confirm. A product identified there as a one-time purchase does not renew automatically. Any legacy subscription remains governed by the terms accepted when it was purchased and can be managed in your Apple account settings.</p>
      <p>Use Restore Purchases in the iOS app to restore eligible access with the Apple account that bought it. A refund, revocation, or expired subscription can change access. Apple handles App Store billing and refund requests. An iOS purchase does not currently unlock the website or transfer practice history between devices.</p>
      <p>The iOS app is also subject to the license terms shown with its App Store listing, including <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Apple’s standard Licensed Application End User License Agreement</a> where applicable. These website terms do not remove rights provided by applicable consumer law or your purchase terms.</p>

      <h2>Applications, local records, and availability</h2>
      <p>Submitting a founding-room application requests a conversation. It takes no payment and does not reserve a place or create a purchase commitment. Any offer will explain its scope, schedule, and price before you accept.</p>
      <p>Practice records are currently stored locally. Clearing browser data, deleting app data, or changing devices can remove them. Use an export feature where one is available if you want a separate copy. Features and external links may change as the service is maintained; the currently available lesson content and access are described in the app or on the relevant page.</p>
      <p>Our <Link href="/privacy">Privacy Policy</Link> explains microphone processing, local records, purchases, hosting, and messages. Contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a> for support or questions about these terms.</p>
    </Article>
  );
}
