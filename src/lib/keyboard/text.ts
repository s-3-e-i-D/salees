export type Lang = "ar" | "en";

const BOUNDARY = /[\s.,!?؟،؛:…“”«»()[\]{}\\/—–\-]/;

export function isBoundary(ch: string): boolean {
  return BOUNDARY.test(ch);
}

export function normalize(raw: string, lang: Lang): string {
  if (lang === "en") return raw.toLowerCase();
  return raw
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

export function detectLang(word: string): Lang {
  return /[\u0600-\u06FF]/.test(word) ? "ar" : "en";
}

export function currentToken(text: string, caret: number): { start: number; word: string } {
  let i = Math.max(0, Math.min(caret, text.length));
  while (i > 0 && !isBoundary(text[i - 1]!)) i -= 1;
  return { start: i, word: text.slice(i, caret) };
}

export function replaceRange(text: string, start: number, end: number, chunk: string) {
  const a = Math.max(0, Math.min(start, end, text.length));
  const b = Math.max(0, Math.min(Math.max(start, end), text.length));
  return {
    text: text.slice(0, a) + chunk + text.slice(b),
    caret: a + chunk.length,
  };
}

export function collapseRepeats(value: string): string {
  let out = "";
  for (const ch of value) {
    if (out[out.length - 1] !== ch) out += ch;
  }
  return out;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = cur.slice();
  }
  return prev[b.length] ?? 0;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function formatCount(n: number, lang: Lang): string {
  const raw = String(n);
  if (lang === "en") return raw;
  return raw.replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);
}
