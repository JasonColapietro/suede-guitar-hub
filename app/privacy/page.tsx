import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { crumbTrail } from "@/lib/breadcrumbs";
import { pageJsonLd } from "@/lib/page-schema";
import { keywordsFor } from "@/lib/keywords";

const description = "How GuitarHub handles microphone input, local progress, optional accounts, web and App Store purchases, plan emails, and messages you send us.";
export const metadata: Metadata = {
  keywords: keywordsFor("/privacy"),
  title: "Privacy Policy | GuitarHub",
  description,
  alternates: { canonical: "https://guitarhub.org/privacy" },
  openGraph: {
    title: "Privacy Policy | GuitarHub",
    description,
    url: "https://guitarhub.org/privacy",
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

const CANONICAL = "https://guitarhub.org/privacy";
const CRUMBS = crumbTrail("Privacy Policy", "/privacy");
const JSON_LD = pageJsonLd({ canonical: CANONICAL, name: "Privacy Policy | GuitarHub", description, crumbs: CRUMBS });

export default function PrivacyPage() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
    <Article crumbs={CRUMBS} eyebrow="GuitarHub" title="Privacy Policy" dek="Your playing stays on your device. Here is what the app and website use, save, and send." updated="2026-11-10" showPracticeCallToAction={false}>
      <p>This policy covers the GuitarHub iOS app and guitarhub.org, operated by Suede AI. For privacy questions or requests, contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.</p>

      <h2>Microphone and audio</h2>
      <p>When you start a tuner, range check, or listening exercise, GuitarHub asks for microphone permission. It analyzes the input on your device to estimate pitch or note timing. For these tools, raw microphone audio is processed live and is not uploaded to our servers or saved as a recording. A practice result can retain derived measurements, such as notes, timing, and a score, in your local practice history.</p>
      <p>When you choose to record a take in an iOS lesson, the app saves one optional recording of up to two minutes for that lesson so you can play it back. The recording stays on your iPhone, is not uploaded, and is excluded from device backups. You can replace or delete it in the app. Because GuitarHub never receives the recording, we cannot access or recover it.</p>
      <p>When you choose to record a take in a voice lesson on guitarhub.org, the website saves one optional recording of up to two minutes for that lesson in this browser’s IndexedDB storage under the current signed-in account or guest scope so you can play it back. It replaces the previous browser take for that lesson within that scope, is never uploaded or synced, and does not score your singing or complete the lesson. The voice lessons moved to Suede Sing on 2026-09-23, which cannot read these recordings, so you can play or delete them on the Saved voice takes page at /learn/voice/recordings after confirming the deletion. Clearing this site’s browser data also removes it, and GuitarHub cannot access or recover it.</p>
      <p>You can stop a listening session and revoke microphone access in your browser or iOS settings. Lessons, reading checks, manual practice, and reference playback can be used without granting microphone permission; exercises that measure your playing need it.</p>

      <h2>Progress, accounts, and preferences</h2>
      <p>The website saves practice plans, lesson progress, quiz answers, counts, reflections, and preferences in your browser’s local storage. The iOS app keeps its profile, settings, and practice history in app storage on your device. Account features are available only when GuitarHub has deliberately enabled its account service. When that service is unavailable, no account or sync data is sent. Accounts are optional: signing in with a code sent to your email creates one, and it stores your email address and the practice history you choose to sync. When you are signed in, the free module your placement picked is saved to your account so it stays the same on every device. Signing in alone does not start practice sync.</p>
      <p>If you sign in and explicitly enable practice sync, GuitarHub sends your account identifier, sync binding, and only new lesson-attempt evidence created after you enabled sync to its server and Supabase. That evidence may include track and lesson identifiers, the attempt time, practice duration, evidence type, assessment, exercise revision, score or tempo when applicable, and reflection, quiz, or study details needed to reconstruct the attempt. Earlier guest or local records stay on your device and are not uploaded automatically. Raw microphone audio and optional lesson recordings are never included in practice sync.</p>
      <p>You can pause sync so new attempts are no longer uploaded. You can also delete your cloud practice history, which pauses sync and removes the account’s synced lesson-attempt evidence. Local device records are preserved and will not be uploaded again automatically; purchase access is unchanged.</p>
      <p>Local records remain until you clear the relevant website data or remove the app’s stored data. Browser settings, device backups, and operating-system restore features can affect how long a copy of these learning records remains; optional iOS lesson recordings are excluded from device backups as described above, while optional website takes remain only in that browser’s site data. Synced lesson-attempt evidence remains under your account until you delete its cloud practice history or request account deletion. Clearing local or cloud records may be irreversible. Export tools, where offered, save a file you control.</p>

      <h2>Purchases</h2>
      <p>Stripe processes purchases made on guitarhub.org. You enter your email and payment details on Stripe’s checkout page, and GuitarHub does not receive your card details. GuitarHub stores the checkout session identifier, payment identifier, email, amount, currency, purchase date, and, if the purchase is refunded, the refund date, and uses them to open lifetime access for an account signed in with that email and to end it after a refund. Stripe keeps its own payment records under <a href="https://stripe.com/privacy">Stripe’s privacy policy</a>.</p>
      <p>Apple handles purchases made through the iOS App Store. The app uses Apple’s transaction and entitlement information to provide purchased access and restore eligible purchases. When account services are available, GuitarHub may use Apple-signed transaction data and an account-binding token to verify, bind, and later reconcile lifetime access with Apple. GuitarHub stores the verified transaction identifiers, app and product identifiers, store environment, purchase, signing, and revocation dates, and account-binding token needed to restore access, recognize refunds, and prevent a purchase from being transferred to another account. When you sign in on iPhone, an Apple purchase made in the app can be linked to your account, together with your email, so the same purchase opens lessons on guitarhub.org; one Apple purchase links to one account.</p>
      <p>GuitarHub does not receive your payment-card details. Apple maintains its own purchase records under <a href="https://www.apple.com/legal/privacy/">Apple’s privacy policy</a>. Removing local practice data, deleting cloud practice history, or deleting your account does not delete a Stripe or Apple purchase or GuitarHub’s verified purchase record.</p>

      <h2>The 30-day plan, guides, and email</h2>
      <p>When you ask for the 30-day plan or a field guide, GuitarHub stores your email address, which form you used, your placement or the guide you asked for, and when each email was sent. It sends the plan or guide you asked for, then practice tips, through Resend: five emails over ten days. There is an unsubscribe link in every email; unsubscribing stops further emails and records the date you unsubscribed. See <a href="https://resend.com/legal/privacy-policy">Resend’s privacy policy</a> for information about its service.</p>

      <h2>Support messages</h2>
      <p>If you email us, your email provider sends the message and any attachments you choose to include. Please avoid sending sensitive information that is not needed for your request.</p>
      <p>Support correspondence is kept to handle your request and related follow-up. You can ask us to correct or delete it at <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>. Some records may need to be retained to meet legal obligations or resolve a dispute.</p>

      <h2>Website hosting and external services</h2>
      <p>Vercel hosts this website and processes ordinary connection information, such as an IP address, requested URL, browser information, and error or security logs, to deliver and protect it. See <a href="https://vercel.com/legal/privacy-notice">Vercel’s privacy notice</a>. GuitarHub runs no analytics and sets no advertising or tracking cookies. The only cookies it sets are the sign-in session cookies an account needs. The website and app do not include advertising trackers or an analytics service that uploads your practice activity.</p>
      <p>When GuitarHub enables optional account services, Supabase provides account authentication and database services. It processes the email, account and session identifiers, synced lesson-attempt evidence, free-module choice, plan and guide email records, and the verified Stripe, purchase, and account-binding records described above to provide those features. See <a href="https://supabase.com/privacy">Supabase’s privacy policy</a>.</p>
      <p>Links to Strumly, teachers, videos, songs, social platforms, or other websites open services with their own privacy practices. Information you provide there is governed by those services. GuitarHub does not send your local practice history with those links.</p>

      <h2>Deleting your account</h2>
      <p>You can delete your account on the account page. Deletion removes your GuitarHub data, including synced practice history, your free-module choice, and your plan and guide email record, and signs you out. A purchase stays tied to your email: sign in again with the same email to use lifetime access. The shared Suede sign-in that other Suede AI products use is kept for those products. Local records on your device stay until you clear them.</p>

      <h2>Your choices and updates</h2>
      <p>You can decline microphone access, leave sync off or pause it, delete cloud practice history, clear local data, unsubscribe from plan and tip emails, delete your account, and choose whether to send us a message. Contact us to ask what account, purchase, or correspondence records we hold or to request access, correction, or deletion. We will handle requests according to the rights that apply where you live. If GuitarHub’s data practices change, we will update this page and its date, and request any permissions needed for new features.</p>
      <p>See also the <Link href="/terms">Terms of Use</Link>.</p>
    </Article>
    </>
  );
}
