import { allLessons, type TrackId } from "./curriculum.ts";
import { guidedLessonIds } from "./instructions.ts";

export const lessonFilters = { guided: "Guided", songs: "Songs", microphone: "Mic exercises", previews: "Previews", all: "All topics" } as const;
export type LessonFilter = keyof typeof lessonFilters;
const guided = new Set(guidedLessonIds);
function searchText(text: string) { return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replaceAll("’", "'"); }

/** The native library's filter and word-search semantics, over actual content. */
export function browseLessons(track: TrackId, filter: LessonFilter = "guided", query = "") {
  const words = searchText(query).split(/\s+/).filter(Boolean);
  return allLessons(track).map(entry => ({ ...entry, isGuided: guided.has(entry.lesson.id) })).filter(entry => {
    const { lesson, module, level, isGuided } = entry;
    if (filter === "guided" && !isGuided) return false;
    if (filter === "songs" && !(isGuided && lesson.type === "song")) return false;
    if (filter === "microphone" && !lesson.practiceSpec) return false;
    if (filter === "previews" && (isGuided || lesson.practiceSpec)) return false;
    const text = searchText([lesson.title, lesson.summary, module.name, level.name].join(" "));
    return words.every(word => text.includes(word));
  });
}
