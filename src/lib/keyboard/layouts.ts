import type { Lang } from "@/lib/keyboard/text";

export type KeyAction =
  | "backspace"
  | "space"
  | "return"
  | "shift"
  | "mode"
  | "modeAlt"
  | "lang"
  | "period"
  | "emoji";

export type KeyDef = {
  id: string;
  label: string;
  insert?: string;
  action?: KeyAction;
  grow?: number;
  special?: boolean;
  longs?: string[];
};

export type KeyRow = {
  dir: "rtl" | "ltr";
  keys: KeyDef[];
};

export type BoardPage = "alpha" | "sym" | "sym2";

const AR_LONG: Record<string, string[]> = {
  ا: ["أ", "إ", "آ"],
  ه: ["ة"],
  ة: ["ه"],
  و: ["ؤ"],
  ي: ["ى", "ئ"],
  ء: ["ئ", "ؤ", "أ"],
  ت: ["ة"],
  ك: ["گ"],
  ب: ["پ"],
  ج: ["چ"],
  ف: ["ڤ"],
  ز: ["ژ"],
};

const EN_LONG: Record<string, string[]> = {
  a: ["à", "á", "â", "ä", "æ"],
  e: ["è", "é", "ê", "ë"],
  i: ["ì", "í", "î", "ï"],
  o: ["ò", "ó", "ô", "ö", "ø"],
  u: ["ù", "ú", "û", "ü"],
  c: ["ç"],
  n: ["ñ"],
  s: ["ß", "ś"],
  y: ["ÿ"],
};

const DIGIT_LONG: Record<string, string[]> = {
  "1": ["١"],
  "2": ["٢"],
  "3": ["٣"],
  "4": ["٤"],
  "5": ["٥"],
  "6": ["٦"],
  "7": ["٧"],
  "8": ["٨"],
  "9": ["٩"],
  "0": ["٠"],
};

function letters(id: string, chars: string, longs: Record<string, string[]>): KeyDef[] {
  return [...chars].filter((ch) => ch !== " ").map((ch) => ({
    id: `${id}-${ch}`,
    label: ch,
    insert: ch,
    longs: longs[ch],
  }));
}

function digits(prefix: string): KeyDef[] {
  return "1234567890".split("").map((d) => ({
    id: `${prefix}-${d}`,
    label: d,
    insert: d,
    longs: DIGIT_LONG[d],
  }));
}

function bottom(lang: Lang, modeLabel: string): KeyRow {
  return {
    dir: "ltr",
    keys: [
      { id: "mode", label: modeLabel, action: "mode", special: true, grow: 1.25 },
      { id: "emoji", label: "emoji", action: "emoji", special: true, grow: 1.05 },
      { id: "space", label: lang === "ar" ? "عربي" : "English", action: "space", grow: 5.2 },
      { id: "period", label: ".", insert: ".", action: "period", special: true, grow: 1.15 },
      { id: "return", label: "return", action: "return", special: true, grow: 1.55 },
    ],
  };
}

function symbolEdge(_lang: Lang, more: KeyDef, letters: KeyDef[], back: KeyDef): KeyDef[] {
  return [more, ...letters, back];
}

export function boardRows(lang: Lang, page: BoardPage): KeyRow[] {
  if (page === "sym") {
    return [
      { dir: "ltr", keys: digits("s") },
      {
        dir: "ltr",
        keys: letters("s2", "-/:؛()«»@\"", {}),
      },
      {
        dir: "ltr",
        keys: symbolEdge(
          lang,
          { id: "sym-more", label: "#+=", action: "modeAlt", special: true, grow: 1.5 },
          letters("s3", "،؟!'…", {}),
          { id: "sym-bs", label: "bs", action: "backspace", special: true, grow: 1.45 },
        ),
      },
      bottom(lang, lang === "ar" ? "أبج" : "ABC"),
    ];
  }
  if (page === "sym2") {
    return [
      { dir: "ltr", keys: letters("x1", "[]{}#%^*+=", {}) },
      { dir: "ltr", keys: letters("x2", "_\\|~<>€£¥•", {}) },
      {
        dir: "ltr",
        keys: symbolEdge(
          lang,
          { id: "sym2-back", label: "123", action: "modeAlt", special: true, grow: 1.5 },
          letters("x3", ".,?!'٪", {}),
          { id: "sym2-bs", label: "bs", action: "backspace", special: true, grow: 1.45 },
        ),
      },
      bottom(lang, lang === "ar" ? "أبج" : "ABC"),
    ];
  }
  if (lang === "en") {
    return [
      { dir: "ltr", keys: digits("n") },
      { dir: "ltr", keys: letters("e1", "qwertyuiop", EN_LONG) },
      { dir: "ltr", keys: letters("e2", "asdfghjkl", EN_LONG) },
      {
        dir: "ltr",
        keys: [
          { id: "shift", label: "shift", action: "shift", special: true, grow: 1.45 },
          ...letters("e3", "zxcvbnm", EN_LONG),
          { id: "en-bs", label: "bs", action: "backspace", special: true, grow: 1.45 },
        ],
      },
      bottom("en", "123"),
    ];
  }
  return [
    { dir: "ltr", keys: digits("n") },
    { dir: "ltr", keys: letters("a1", "ضصثقفغعهخحج", AR_LONG) },
    { dir: "ltr", keys: letters("a2", "شسيبلاتنمكة", AR_LONG) },
    {
      dir: "ltr",
      keys: [
        { id: "a3-ء", label: "ء", insert: "ء", longs: ["أ", "إ", "آ", "ئ"] },
        { id: "a3-ظ", label: "ظ", insert: "ظ" },
        { id: "a3-ط", label: "ط", insert: "ط" },
        { id: "a3-ذ", label: "ذ", insert: "ذ" },
        { id: "a3-د", label: "د", insert: "د" },
        { id: "a3-ز", label: "ز", insert: "ز", longs: AR_LONG["ز"] },
        { id: "a3-ر", label: "ر", insert: "ر" },
        { id: "a3-و", label: "و", insert: "و", longs: ["ؤ"] },
        { id: "a3-ى", label: "ى", insert: "ى", longs: ["ئ", "ي"] },
        { id: "ar-bs", label: "bs", action: "backspace", special: true, grow: 1.35 },
      ],
    },
    bottom("ar", "١٢٣"),
  ];
}
