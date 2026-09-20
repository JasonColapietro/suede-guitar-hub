import type { Metadata } from "next";
import Link from "next/link";
import { VocalLibrary } from "@/components/learning/VocalMaterial";
import { hasVerifiedTrackAccess } from "@/lib/learning/access";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
import { vocalMaterialLibrary } from "@/lib/learning/vocal-material";
import styles from "@/components/learning/Learning.module.css";

export const metadata: Metadata = {
  title: "Complete Voice Practice Library | GuitarHub",
  description: "The complete GuitarHub collection of voice warmups, public-domain studies, and included readings for lifetime learners.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

export default async function VoiceMaterialsPage() {
  const access = await getVerifiedLearningAccess();
  const entitled = hasVerifiedTrackAccess("voice", access);
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href="/learn/voice">Voice</Link><span aria-hidden="true">/</span><span>Practice library</span></nav>
    {entitled ? <VocalLibrary material={vocalMaterialLibrary()} /> : <section className={styles.panel}>
      <h1>Complete voice practice library</h1>
      <p>The lesson path keeps each module focused. Complete Lifetime access also includes the full collection of 70 studies and 26 readings in one browsable library.</p>
      <div className={styles.notice}>{access.status === "unavailable"
        ? "We could not verify your lifetime access. Try again shortly."
        : access.enabled
          ? "This library requires Complete Lifetime voice access linked to your account."
          : "Account-linked lifetime access is not available on the web yet. The free voice lesson path remains available."}</div>
      <div className={styles.actions}>{access.enabled && <Link className={styles.primary} href="/account?next=%2Flearn%2Fvoice%2Fmaterials">{access.accountId ? "View account access" : "Sign in to check access"}</Link>}<Link className={styles.secondary} href="/learn/voice">Return to voice lessons</Link></div>
    </section>}
  </>;
}
