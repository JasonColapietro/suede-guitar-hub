import { PROOF } from "@/lib/site";

/**
 * The Clutch ranking sentence, worded once so the footer, the notes and the
 * author box cannot drift apart. Server Component. Renders inline text, so
 * the caller supplies the surrounding paragraph and, outside prose columns,
 * a class for the links.
 */
export default function ClutchRanking({ linkClassName }: { linkClassName?: string }) {
  return (
    <>
      Suede AI ranks among{" "}
      <a href={PROOF.clutchProfile} className={linkClassName}>Clutch</a>&apos;s{" "}
      <a href={PROOF.clutchFlorida} className={linkClassName}>Top 30 AI Consultants in Florida</a>{" "}
      and{" "}
      <a href={PROOF.clutchUs} className={linkClassName}>Top 50 AI Consultants nationwide</a>{" "}
      (November 2026).
    </>
  );
}
