import { wordsByFirst } from "@/lib/keyboard/lexicon";
import {
  collapseRepeats,
  levenshtein,
  normalize,
  type Lang,
} from "@/lib/keyboard/text";

export type LearnedWord = {
  word: string;
  count: number;
  last: number;
  lang: Lang;
};

export type Suggestion = {
  word: string;
  learned: boolean;
};

export function suggest(prefix: string, lang: Lang, learned: readonly LearnedWord[]): Suggestion[] {
  const p = normalize(prefix, lang);
  const personal = learned
    .filter((w) => w.lang === lang && w.count >= 2)
    .filter((w) => p === "" || normalize(w.word, lang).startsWith(p))
    .sort((a, b) => b.last - a.last || b.count - a.count);

  if (p === "") {
    return personal.slice(0, 8).map((w) => ({ word: w.word, learned: true }));
  }

  const ranked: { word: string; learned: boolean; rank: number }[] = [];
  personal.forEach((w, index) => ranked.push({ word: w.word, learned: true, rank: -1000 + index }));

  let index = 0;
  if (p[0]) {
    for (const w of wordsByFirst(lang, p[0])) {
      const key = normalize(w, lang);
      if (!key.startsWith(p)) continue;
      let rank = index;
      if (lang === "ar" && p.length <= 2 && key.length <= 2) rank += 900;
      ranked.push({ word: w, learned: false, rank });
      index += 1;
      if (index > 500) break;
    }
  }

  ranked.sort((a, b) => a.rank - b.rank);
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    const key = normalize(item.word, lang);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ word: item.word, learned: item.learned });
    if (out.length >= 8) break;
  }
  return out;
}

export function bestSwipe(
  path: string,
  lang: Lang,
  learned: readonly LearnedWord[],
): string | null {
  const traced = collapseRepeats(normalize(path, lang));
  if (traced.length < 2) return null;
  const first = traced[0]!;
  const last = traced[traced.length - 1]!;
  let bestWord: string | null = null;
  let bestScore = Infinity;

  const consider = (word: string, bonus: number) => {
    const n = normalize(word, lang);
    if (n.length < 2 || n[0] !== first) return;
    if (Math.abs(n.length - traced.length) > 5) return;
    const endPenalty = n[n.length - 1] === last ? 0 : 1.15;
    const dist = levenshtein(traced, n);
    const score = dist + Math.abs(n.length - traced.length) * 0.2 + endPenalty - bonus;
    if (score < bestScore) {
      bestScore = score;
      bestWord = word;
    }
  };

  for (const w of learned) {
    if (w.lang === lang) consider(w.word, w.count >= 2 ? 1.7 : 0.25);
  }
  for (const w of wordsByFirst(lang, first)) consider(w, 0);

  if (bestWord == null || bestScore > Math.max(3, traced.length * 0.85)) return null;
  return bestWord;
}
