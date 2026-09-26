import BookCover from "@/components/tone/BookCover";
import { FIELD_GUIDES, type FieldGuide } from "@/lib/tone/field-guides";

/**
 * The free PDF shelf. Each book is a direct download: no email, no account,
 * in keeping with the rest of the site.
 */
export default function GuideShelf({ guides = FIELD_GUIDES, dark = false }: { guides?: readonly FieldGuide[]; dark?: boolean }) {
  return (
    <ul className={`grid gap-x-6 gap-y-12 ${guides.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : guides.length === 2 ? "sm:grid-cols-2" : ""}`}>
      {guides.map(guide => (
        <li key={guide.slug}>
          <a href={guide.file} download className="group block text-center" aria-label={`Download the free PDF: ${guide.title}`}>
            <BookCover guide={guide} />
            <p className={`mt-6 font-display text-xl ${dark ? "text-cream" : "text-indigo-deep"}`}>{guide.title}</p>
            <p className={`mx-auto mt-2 max-w-xs text-sm leading-relaxed ${dark ? "text-white/75" : "text-ink/70"}`}>{guide.hook}</p>
            <span className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${dark ? "bg-peach text-indigo-deep group-hover:brightness-105" : "bg-indigo-deep text-cream group-hover:bg-indigo-mid"}`}>
              Free PDF <span aria-hidden>↓</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
