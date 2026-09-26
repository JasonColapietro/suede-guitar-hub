import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";

const description = "How GuitarHub handles microphone input, local learning progress, optional account sync, App Store purchases, and messages you send us.";
export const metadata: Metadata = {
  title: "Privacy Policy | GuitarHub",
  description,
  alternates: { canonical: "https://guitarhub.org/privacy" },
  openGraph: {
    title: "Privacy Policy | GuitarHub",
    description,
    url: "https://guitarhub.org/privacy",
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

export default function PrivacyPage() {
  return (
    <Article eyebrow="GuitarHub" title="Privacy Policy" dek="Your playing stays on your device. Here is what the app and website use, save, and send." updated="2026-09-26" showPracticeCallToAction={false}>
      <p>This policy covers the GuitarHub iOS app and guitarhub.org, operated by Suede AI. For privacy questions or requests, contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.</p>

      <h2>Microphone and audio</h2>
      <p>When you start a tuner, range check, or listening exercise, GuitarHub asks for microphone permission. It analyzes the input on your device to estimate pitch or note timing. For these tools, raw microphone audio is processed live and is not uploaded to our servers or saved as a recording. A practice result can retain derived measurements, such as notes, timing, and a score, in your local practice history.</p>
      <p>The chord detector and intonation checker on guitarhub.org work the same way: they listen only after you press start and allow the microphone, estimate pitch or pitch classes on your device, and keep nothing once you stop. The pedal lab can also take a live microphone or instrument input when you choose it; that sound is processed and played back to you in real time, and it is not recorded, saved or uploaded.</p>
      <p>When you open a song in the slow-downer, your browser reads the file from your device and plays it on the page. The file is not uploaded, copied to a server or kept after you leave; only your last speed and pitch settings are remembered in this browser.</p>
      <p>When you choose to record a take in an iOS lesson, the app saves one optional recording of up to two minutes for that lesson so you can play it back. The recording stays on your iPhone, is not uploaded, and is excluded from device backups. You can replace or delete it in the app. Because GuitarHub never receives the recording, we cannot access or recover it.</p>
      <p>When you choose to record a take in a voice lesson on guitarhub.org, the website saves one optional recording of up to two minutes for that lesson in this browser’s IndexedDB storage under the current signed-in account or guest scope so you can play it back. It replaces the previous browser take for that lesson within that scope, is never uploaded or synced, and does not score your singing or complete the lesson. The voice lessons moved to Suede Sing on 2026-09-23, which cannot read these recordings, so you can play or delete them on the Saved voice takes page at /learn/voice/recordings after confirming the deletion. Clearing this site’s browser data also removes it, and GuitarHub cannot access or recover it.</p>
      <p>You can stop a listening session and revoke microphone access in your browser or iOS settings. Lessons, reading checks, manual practice, and reference playback can be used without granting microphone permission; exercises that measure your playing need it.</p>

      <h2>Progress, accounts, and preferences</h2>
      <p>The website saves practice plans, lesson progress, quiz answers, counts, reflections, and preferences in your browser’s local storage. The iOS app keeps its profile, settings, and practice history in app storage on your device. Account features are available only when GuitarHub has deliberately enabled its account service. When that service is unavailable, no account or sync data is sent. Signing in alone does not start practice sync.</p>
      <p>If you sign in and explicitly enable practice sync, GuitarHub sends your account identifier, sync binding, and only new lesson-attempt evidence created after you enabled sync to its server and Supabase. That evidence may include track and lesson identifiers, the attempt time, practice duration, evidence type, assessment, exercise revision, score or tempo when applicable, and reflection, quiz, or study details needed to reconstruct the attempt. Earlier guest or local records stay on your device and are not uploaded automatically. Raw microphone audio and optional lesson recordings are never included in practice sync.</p>
      <p>You can pause sync so new attempts are no longer uploaded. You can also delete your cloud practice history, which pauses sync and removes the account’s synced lesson-attempt evidence. Local device records are preserved and will not be uploaded again automatically; purchase access is unchanged.</p>
      <p>Local records remain until you clear the relevant website data or remove the app’s stored data. Browser settings, device backups, and operating-system restore features can affect how long a copy of these learning records remains; optional iOS lesson recordings are excluded from device backups as described above, while optional website takes remain only in that browser’s site data. Synced lesson-attempt evidence remains under your account until you delete its cloud practice history or request account deletion. Clearing local or cloud records may be irreversible. Export tools, where offered, save a file you control.</p>

      <h2>Purchases</h2>
      <p>Apple handles purchases made through the iOS App Store. The app uses Apple’s transaction and entitlement information to provide purchased access and restore eligible purchases. When account services are available, GuitarHub may use Apple-signed transaction data and an account-binding token to verify, bind, and later reconcile lifetime access with Apple. GuitarHub stores the verified transaction identifiers, app and product identifiers, store environment, purchase, signing, and revocation dates, and account-binding token needed to restore access, recognize refunds, and prevent a purchase from being transferred to another account.</p>
      <p>GuitarHub does not receive your payment-card details. Apple maintains its own purchase records under <a href="https://www.apple.com/legal/privacy/">Apple’s privacy policy</a>. Removing local practice data or deleting cloud practice history does not delete an Apple purchase or GuitarHub’s verified purchase record.</p>

      <h2>Applications and support messages</h2>
      <p>If you submit the website’s founding-room application, its name, email, experience, and goal fields are sent through Resend to our support inbox. We use that information to review your application and respond. If you use an email link instead, your email provider sends the message and any attachments you choose to include. Please avoid sending sensitive information that is not needed for your request.</p>
      <p>Application and support correspondence is kept to handle your request and related follow-up. You can ask us to correct or delete it at <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>. Some records may need to be retained to meet legal obligations or resolve a dispute. See <a href="https://resend.com/legal/privacy-policy">Resend’s privacy policy</a> for information about its service.</p>

      <h2>Website hosting and external services</h2>
      <p>Vercel hosts this website and processes ordinary connection information, such as an IP address, requested URL, browser information, and error or security logs, to deliver and protect it. See <a href="https://vercel.com/legal/privacy-notice">Vercel’s privacy notice</a>. The GuitarHub website and app do not include advertising trackers or an analytics service that uploads your practice activity.</p>
      <p>When GuitarHub enables optional account services, Supabase provides account authentication and database services. It processes the email, account and session identifiers, synced lesson-attempt evidence, and verified purchase and account-binding records described above to provide those features. See <a href="https://supabase.com/privacy">Supabase’s privacy policy</a>.</p>
      <p>Links to Strumly, teachers, videos, songs, social platforms, or other websites open services with their own privacy practices. Information you provide there is governed by those services. GuitarHub does not send your local practice history with those links.</p>

      <h2>Your choices and updates</h2>
      <p>You can decline microphone access, leave sync off or pause it, delete cloud practice history, clear local data, and choose whether to submit a message. Contact us to ask what account, purchase, or correspondence records we hold or to request access, correction, or deletion. We will handle requests according to the rights that apply where you live. If GuitarHub’s data practices change, we will update this page and its date, and request any permissions needed for new features.</p>
      <p>See also the <Link href="/terms">Terms of Use</Link>.</p>
    </Article>
  );
}
