import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import LevelPicker from "@/components/LevelPicker";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const url = `${SITE_URL}/start`;
const title = "Find Your Guitar Level | GuitarHub";
const description = "New to guitar, comfortable with open chords, or already advanced? Pick the one that sounds like you and start at the right lesson.";
export const metadata: Metadata = {
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

export default function StartPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">Find your level</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-indigo-deep sm:text-5xl">Which one sounds like you?</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">Pick the closest match. You can open any lesson from any level later, and nothing here is a test.</p>
        <div className="mt-10"><LevelPicker /></div>
        <p className="mt-8 text-sm text-ink/60">Not sure? Start one level lower than you think. The early lessons move quickly if they are easy, and they close gaps you did not know you had.</p>
      </main>
      <SiteFooter />
    </>
  );
}
