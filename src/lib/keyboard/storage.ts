import type { LearnedWord } from "@/lib/keyboard/predict";
import type { Lang } from "@/lib/keyboard/text";

const KEY = "salees.v1";

export type SaleesStore = {
  learned: LearnedWord[];
  draft: string;
  lang: Lang;
};

const EMPTY: SaleesStore = { learned: [], draft: "", lang: "ar" };

export function loadStore(): SaleesStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Partial<SaleesStore>;
    const learned = Array.isArray(data.learned)
      ? data.learned.flatMap((w) => {
          if (!w || typeof w !== "object") return [];
          const row = w as Partial<LearnedWord>;
          if (typeof row.word !== "string" || typeof row.count !== "number") return [];
          if (row.lang !== "ar" && row.lang !== "en") return [];
          const item: LearnedWord = {
            word: row.word,
            count: row.count,
            last: typeof row.last === "number" ? row.last : 0,
            lang: row.lang,
          };
          return [item];
        })
      : [];
    return {
      learned,
      draft: typeof data.draft === "string" ? data.draft : "",
      lang: data.lang === "en" ? "en" : "ar",
    };
  } catch {
    return EMPTY;
  }
}

export function saveStore(store: SaleesStore) {
  try {
    const learned = [...store.learned]
      .sort((a, b) => b.last - a.last)
      .slice(0, 400);
    localStorage.setItem(KEY, JSON.stringify({ ...store, learned }));
  } catch {
    /* private mode / quota — typing still works for the session */
  }
}
