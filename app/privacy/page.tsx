import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";

const description = "How GuitarHub handles microphone input, local learning progress, App Store purchases, and messages you send us.";
export const metadata: Metadata = {
  title: "Privacy Policy | GuitarHub",
  description,
  alternates: { canonical: "https://guitarhub.org/privacy" },
  openGraph: { title: "Privacy Policy | GuitarHub", description, url: "https://guitarhub.org/privacy", type: "website" },
};

export default function PrivacyPage() {
  return (
    <Article eyebrow="GuitarHub" title="Privacy Policy" dek="Your playing stays on your device. Here is what the app and website use, save, and send." updated="2026-09-04" showPracticeCallToAction={false}>
      <p>This policy covers the GuitarHub iOS app and guitarhub.org, operated by Suede Labs. For privacy questions or requests, contact <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.</p>

      <h2>Microphone and audio</h2>
      <p>When you start a tuner, range check, or listening exercise, GuitarHub asks for microphone permission. It analyzes the input on your device to estimate pitch or note timing. Raw microphone audio is not uploaded to our servers or saved as a recording. A practice result can retain derived measurements, such as notes, timing, and a score, in your local practice history.</p>
      <p>You can stop a listening session and revoke microphone access in your browser or iOS settings. Lessons, reading checks, manual practice, and reference playback can be used without granting microphone permission; exercises that measure your playing need it.</p>

      <h2>Progress and preferences</h2>
      <p>The website saves practice plans, lesson progress, quiz answers, counts, reflections, and preferences in your browser’s local storage. The iOS app keeps its profile, settings, and practice history in app storage on your device. These learning records are not sent to a GuitarHub account or synchronized between devices in the current version.</p>
      <p>Local records remain until you clear the relevant website data or remove the app’s stored data. Browser settings, device backups, and operating-system restore features can affect how long a copy remains. Clearing local records may be irreversible; we cannot recover records we have never received. Export tools, where offered, save a file you control.</p>

      <h2>Purchases</h2>
      <p>Apple handles purchases made through the iOS App Store. The app uses Apple’s transaction and entitlement information to provide purchased access and restore eligible purchases. GuitarHub does not receive your payment-card details. Apple maintains its own purchase records under <a href="https://www.apple.com/legal/privacy/">Apple’s privacy policy</a>. Removing local practice data does not delete an Apple purchase or cancel a subscription.</p>

      <h2>Applications and support messages</h2>
      <p>If you submit the website’s founding-room application, its name, email, experience, and goal fields are sent through Resend to our support inbox. We use that information to review your application and respond. If you use an email link instead, your email provider sends the message and any attachments you choose to include. Please avoid sending sensitive information that is not needed for your request.</p>
      <p>Application and support correspondence is kept to handle your request and related follow-up. You can ask us to correct or delete it at <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>. Some records may need to be retained to meet legal obligations or resolve a dispute. See <a href="https://resend.com/legal/privacy-policy">Resend’s privacy policy</a> for information about its service.</p>

      <h2>Website hosting and external services</h2>
      <p>Vercel hosts this website and processes ordinary connection information, such as an IP address, requested URL, browser information, and error or security logs, to deliver and protect it. See <a href="https://vercel.com/legal/privacy-notice">Vercel’s privacy notice</a>. The GuitarHub website and app do not include advertising trackers or an analytics service that uploads your practice activity.</p>
      <p>Links to Strumly, teachers, videos, songs, social platforms, or other websites open services with their own privacy practices. Information you provide there is governed by those services. GuitarHub does not send your local practice history with those links.</p>

      <h2>Your choices and updates</h2>
      <p>You can decline microphone access, clear local data, and choose whether to submit a message. Contact us to ask what correspondence we hold or to request access, correction, or deletion. We will handle requests according to the rights that apply where you live. If GuitarHub’s data practices change, we will update this page and its date, and request any permissions needed for new features.</p>
      <p>See also the <Link href="/terms">Terms of Use</Link>.</p>
    </Article>
  );
}
