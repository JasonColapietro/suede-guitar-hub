import type { LessonType } from "./models.ts";

export const lessonFilters = { guided: "Guided", songs: "Songs", microphone: "Mic exercises", previews: "Previews", all: "All topics" } as const;
export type LessonFilter = keyof typeof lessonFilters;

/** The fields the library's filters and word search read. */
export interface SearchableLesson { title: string; summary: string; type: LessonType; mic: boolean; isGuided: boolean; moduleName: string; levelName: string }

function searchText(text: string) { return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replaceAll("’", "'"); }

/** The native library's filter and word-search semantics, over actual content. Data-free, so the browser can load it without the curriculum. */
export function lessonMatcher(filter: LessonFilter = "guided", query = "") {
  const words = searchText(query).split(/\s+/).filter(Boolean);
  return (entry: SearchableLesson) => {
    if (filter === "guided" && !entry.isGuided) return false;
    if (filter === "songs" && !(entry.isGuided && entry.type === "song")) return false;
    if (filter === "microphone" && !entry.mic) return false;
    if (filter === "previews" && (entry.isGuided || entry.mic)) return false;
    const text = searchText([entry.title, entry.summary, entry.moduleName, entry.levelName].join(" "));
    return words.every(word => text.includes(word));
  };
}
