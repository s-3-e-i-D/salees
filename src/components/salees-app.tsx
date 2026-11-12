import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowBigUp, BookText, Clipboard, CornerDownLeft, Delete, Globe, Mic, Pin, Smile, X } from "lucide-react";
import { EMOJI_GROUPS } from "@/lib/keyboard/emoji";
import { boardRows, type KeyAction, type KeyDef } from "@/lib/keyboard/layouts";
import { bestSwipe, suggest, type LearnedWord, type Suggestion } from "@/lib/keyboard/predict";
import { loadStore, saveStore } from "@/lib/keyboard/storage";
import {
  collapseRepeats,
  currentToken,
  detectLang,
  formatCount,
  isBoundary,
  normalize,
  replaceRange,
  type Lang,
} from "@/lib/keyboard/text";

type Shift = "off" | "once" | "caps";
type Sel = { start: number; end: number };
type Pop = { x: number; y: number; text: string; wide: boolean };
type VariantUi = { items: string[]; selected: string; x: number; y: number };
type Gesture = {
  pointerId: number;
  ids: string[];
  parts: string[];
  dist: number;
  lastX: number;
  lastY: number;
  originX: number;
  variant: boolean;
  kind: "letter" | "space";
  switched: boolean;
  committed?: string;
};

export function SaleesApp() {
  const [text, setText] = useState("");
  const [sel, setSel] = useState<Sel>({ start: 0, end: 0 });
  const [alpha, setAlpha] = useState<Lang>("ar");
  const [page, setPage] = useState<"alpha" | "sym" | "sym2">("alpha");
  const [shift, setShift] = useState<Shift>("off");
  const [learned, setLearned] = useState<LearnedWord[]>([]);
  const [sheet, setSheet] = useState(false);
  const [clipsOn, setClipsOn] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [emojiOn, setEmojiOn] = useState(false);
  const [emojiCat, setEmojiCat] = useState(0);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [downId, setDownId] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [variant, setVariant] = useState<VariantUi | null>(null);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const micRef = useRef<SpeechRec | null>(null);
  const textRef = useRef("");
  const selRef = useRef<Sel>({ start: 0, end: 0 });
  const learnedRef = useRef<LearnedWord[]>([]);
  const alphaRef = useRef<Lang>("ar");
  const shiftRef = useRef<Shift>("off");
  const keyByIdRef = useRef(new Map<string, KeyDef>());
  const gesturesRef = useRef(new Map<number, Gesture>());
  const clipsRef = useRef<Clip[]>([]);
  const holdPointer = useRef<number | null>(null);
  const variantRef = useRef<VariantUi | null>(null);
  const holdRef = useRef(0);
  const repeatRef = useRef(0);
  const longRef = useRef(0);
  const lastShift = useRef(0);

  const rows = boardRows(alpha, page);
  keyByIdRef.current = new Map(rows.flatMap((row) => row.keys.map((key) => [key.id, key])));

  useEffect(() => {
    const stored = loadStore();
    learnedRef.current = stored.learned;
    textRef.current = stored.draft;
    const caret = stored.draft.length;
    selRef.current = { start: caret, end: caret };
    alphaRef.current = stored.lang;
    setLearned(stored.learned);
    setText(stored.draft);
    setSel(selRef.current);
    setAlpha(stored.lang);
    setHydrated(true);
    const savedClips = loadClips();
    clipsRef.current = savedClips;
    setClips(savedClips);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveStore({
        learned: learnedRef.current,
        draft: textRef.current,
        lang: alphaRef.current,
      });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [text, learned, alpha, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || document.activeElement !== el) return;
    if (el.selectionStart !== sel.start || el.selectionEnd !== sel.end) {
      el.setSelectionRange(sel.start, sel.end);
    }
  }, [text, sel]);

  function focusEditor() {
    areaRef.current?.focus({ preventScroll: true });
  }

  function commitEdit(nextText: string, caret: number) {
    textRef.current = nextText;
    selRef.current = { start: caret, end: caret };
    setText(nextText);
    setSel(selRef.current);
  }

  function remember(raw: string) {
    const word = raw.trim();
    if (!/^[\p{L}]{2,32}$/u.test(word)) return;
    const lang = detectLang(word);
    const key = normalize(word, lang);
    const prev = learnedRef.current;
    const idx = prev.findIndex((item) => item.lang === lang && normalize(item.word, lang) === key);
    let next: LearnedWord[];
    let justLearned = false;
    if (idx === -1) {
      next = [...prev, { word, count: 1, last: Date.now(), lang }];
    } else {
      const item = prev[idx]!;
      const count = item.count + 1;
      next = prev.slice();
      next[idx] = { ...item, word, count, last: Date.now() };
      justLearned = count === 2;
    }
    learnedRef.current = next;
    setLearned(next);
    if (justLearned) {
      setToast(alphaRef.current === "ar" ? `حفظت «${word}»` : `Saved “${word}”`);
    }
  }

  function forget(word: string, lang: Lang) {
    const key = normalize(word, lang);
    const next = learnedRef.current.filter(
      (item) => !(item.lang === lang && normalize(item.word, lang) === key),
    );
    learnedRef.current = next;
    setLearned(next);
  }

  function shapeChar(ch: string) {
    if (alphaRef.current !== "en" || shiftRef.current === "off") return ch;
    const upper = ch.toLocaleUpperCase();
    if (shiftRef.current === "once") {
      shiftRef.current = "off";
      setShift("off");
    }
    return upper;
  }

  function shapeWord(word: string) {
    if (alphaRef.current !== "en" || shiftRef.current === "off") return word;
    if (shiftRef.current === "once") {
      shiftRef.current = "off";
      setShift("off");
      return word.slice(0, 1).toLocaleUpperCase() + word.slice(1);
    }
    return word.toLocaleUpperCase();
  }

  function insertRaw(chunk: string) {
    const next = replaceRange(textRef.current, selRef.current.start, selRef.current.end, chunk);
    commitEdit(next.text, next.caret);
  }

  function commitCurrent() {
    if (selRef.current.start !== selRef.current.end) return;
    const token = currentToken(textRef.current, selRef.current.start);
    if (token.word) remember(token.word);
  }

  function doSpace() {
    const t = textRef.current;
    const start = selRef.current.start;
    const end = selRef.current.end;
    if (start !== end || start === 0) {
      insertRaw(" ");
      return;
    }
    const prev = t[start - 1] ?? "";
    const before = t[start - 2] ?? "";
    const punct = /[^\p{L}\p{N}\s]/u;
    if (prev === " " && before && /\p{L}/u.test(before) && !punct.test(before)) {
      const next = replaceRange(t, start - 1, start, ". ");
      commitEdit(next.text, next.caret);
      return;
    }
    commitCurrent();
    insertRaw(" ");
  }

  function doBackspace() {
    const t = textRef.current;
    const start = selRef.current.start;
    const end = selRef.current.end;
    if (start !== end) {
      const next = replaceRange(t, start, end, "");
      commitEdit(next.text, next.caret);
      return;
    }
    if (start === 0) return;
    const next = replaceRange(t, start - 1, start, "");
    commitEdit(next.text, next.caret);
  }

  function placeWord(word: string) {
    const shaped = shapeWord(word);
    const t = textRef.current;
    const start = selRef.current.start;
    const end = selRef.current.end;
    const token = currentToken(t, start);
    const from = start === end ? token.start : start;
    const next = replaceRange(t, from, Math.max(start, end), `${shaped} `);
    commitEdit(next.text, next.caret);
    remember(shaped);
  }

  function toggleShift() {
    if (alphaRef.current !== "en") return;
    const now = Date.now();
    const prev = shiftRef.current;
    let next: Shift;
    if (prev === "caps") next = "off";
    else if (prev === "once" && now - lastShift.current < 320) next = "caps";
    else if (prev === "once") next = "off";
    else next = "once";
    shiftRef.current = next;
    setShift(next);
    lastShift.current = now;
  }

  function buzz() {
    try {
      navigator.vibrate?.(12);
    } catch {
      /* Safari has no vibration API */
    }
  }

  function dropCommitted(committed: string | undefined) {
    if (!committed || selRef.current.start !== selRef.current.end) return;
    const t = textRef.current;
    const caret = selRef.current.start;
    if (t.slice(caret - committed.length, caret) !== committed) return;
    const next = replaceRange(t, caret - committed.length, caret, "");
    commitEdit(next.text, next.caret);
  }

  function publishClips(next: Clip[]) {
    clipsRef.current = next;
    setClips(next);
    saveClips(next);
  }

  function addClip(raw: string) {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, 800);
    if (!text) return;
    const stamp = Date.now();
    const alive = clipsRef.current.filter((clip) => clip.pinned || stamp - clip.at < CLIP_MS);
    const same = alive.find((clip) => clip.text === text);
    const merged = same
      ? alive.map((clip) => (clip.id === same.id ? { ...clip, at: stamp } : clip))
      : [{ id: `${stamp}-${Math.random().toString(36).slice(2, 7)}`, text, pinned: false, at: stamp }, ...alive];
    const pinned = merged.filter((clip) => clip.pinned).slice(0, 40);
    const fresh = merged.filter((clip) => !clip.pinned).slice(0, 15);
    publishClips([...pinned, ...fresh]);
  }

  function setPinned(id: string, pinned: boolean) {
    publishClips(
      clipsRef.current.map((clip) => (clip.id === id ? { ...clip, pinned, at: Date.now() } : clip)),
    );
  }

  function stopMic() {
    const rec = micRef.current;
    micRef.current = null;
    setListening(false);
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
  }

  function toggleMic() {
    if (micRef.current) {
      stopMic();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      setToast(alphaRef.current === "ar" ? "المايك غير متاح في هذا المتصفح" : "Microphone isn't available in this browser");
      return;
    }
    const rec = new Ctor();
    rec.lang = alphaRef.current === "ar" ? "ar-SA" : "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const said = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
      if (!said) return;
      const t = textRef.current;
      const start = selRef.current.start;
      const gap = start > 0 && t[start - 1] && !/\s/.test(t[start - 1] ?? "") ? " " : "";
      insertRaw(gap + said);
    };
    rec.onerror = () => {
      micRef.current = null;
      setListening(false);
      setToast(alphaRef.current === "ar" ? "ما قدر المايك يسمع" : "Couldn't hear anything");
    };
    rec.onend = () => {
      micRef.current = null;
      setListening(false);
    };
    micRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      micRef.current = null;
      setListening(false);
      setToast(alphaRef.current === "ar" ? "المايك غير متاح هنا" : "Microphone isn't available here");
    }
  }

  function switchLang() {
    const next: Lang = alphaRef.current === "ar" ? "en" : "ar";
    alphaRef.current = next;
    shiftRef.current = "off";
    setShift("off");
    setAlpha(next);
    setPage("alpha");
    setEmojiOn(false);
  }

  function runAction(action: KeyAction) {
    if (action === "space") doSpace();
    else if (action === "return") {
      commitCurrent();
      insertRaw("\n");
    } else if (action === "period") {
      commitCurrent();
      insertRaw(".");
    } else if (action === "shift") toggleShift();
    else if (action === "lang") switchLang();
    else if (action === "emoji") setEmojiOn((open) => !open);
    else if (action === "mode") {
      setEmojiOn(false);
      setPage((current) => (current === "alpha" ? "sym" : "alpha"));
    } else if (action === "modeAlt") {
      setEmojiOn(false);
      setPage((current) => (current === "sym2" ? "sym" : "sym2"));
    } else doBackspace();
  }

  function clearHold() {
    window.clearTimeout(holdRef.current);
    window.clearInterval(repeatRef.current);
    window.clearTimeout(longRef.current);
  }

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);
      const next = clipsRef.current.filter((clip) => clip.pinned || stamp - clip.at < CLIP_MS);
      if (next.length !== clipsRef.current.length) publishClips(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    let stopped = false;
    let left = false;
    async function pullClipboard() {
      if (stopped || !left || document.visibilityState === "hidden") return;
      try {
        const text = await navigator.clipboard.readText();
        if (!stopped && text.trim()) addClip(text);
      } catch {
        /* iOS hides the clipboard until the user pastes */
      }
    }
    function onVis() {
      if (document.visibilityState === "hidden") {
        left = true;
        gesturesRef.current.clear();
        clearHold();
        return;
      }
      void pullClipboard();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    function onCopy(event: ClipboardEvent) {
      const area = areaRef.current;
      let text = "";
      if (area && area.selectionStart !== area.selectionEnd) {
        text = area.value.slice(area.selectionStart, area.selectionEnd);
      }
      if (!text.trim()) text = document.getSelection()?.toString() ?? "";
      if (!text.trim()) text = event.clipboardData?.getData("text/plain") ?? "";
      addClip(text);
    }
    function onPaste(event: ClipboardEvent) {
      addClip(event.clipboardData?.getData("text/plain") ?? "");
    }
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  useEffect(() => {
    function keyAt(x: number, y: number) {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-k]");
      if (!el?.dataset.k) return null;
      return keyByIdRef.current.get(el.dataset.k) ?? null;
    }

    function onMove(event: PointerEvent) {
      const gesture = gesturesRef.current.get(event.pointerId);
      if (!gesture) return;
      event.preventDefault();
      if (gesture.kind === "space") {
        if (!gesture.switched && Math.abs(event.clientX - gesture.originX) >= 28) {
          gesture.switched = true;
          switchLang();
          buzz();
        }
        return;
      }
      gesture.dist += Math.hypot(event.clientX - gesture.lastX, event.clientY - gesture.lastY);
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;

      if (gesture.variant) {
        const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(
          "[data-variant]",
        );
        const ui = variantRef.current;
        if (hit?.dataset.variant && ui && hit.dataset.variant !== ui.selected) {
          const next = { ...ui, selected: hit.dataset.variant };
          variantRef.current = next;
          setVariant(next);
        }
        return;
      }

      if (gesture.dist > 12) window.clearTimeout(longRef.current);
      const spec = keyAt(event.clientX, event.clientY);
      if (!spec?.insert || spec.action) return;
      if (gesture.ids[gesture.ids.length - 1] !== spec.id) {
        gesture.ids.push(spec.id);
        gesture.parts.push(spec.insert);
      }
      setDownId(spec.id);
      const rect = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-k]")
        ?.getBoundingClientRect();
      if (!rect) return;
      const traced = gesture.parts.join("");
      const lettersOnly = /^[\p{L}]+$/u.test(traced);
      if (lettersOnly && collapseRepeats(traced).length >= 2 && gesture.dist > 28) {
        const match = bestSwipe(traced, alphaRef.current, learnedRef.current);
        setPop({
          x: rect.left + rect.width / 2,
          y: rect.top,
          text: match ?? traced,
          wide: true,
        });
      } else {
        setPop({ x: rect.left + rect.width / 2, y: rect.top, text: spec.label, wide: false });
      }
    }

    function onUp(event: PointerEvent) {
      if (holdPointer.current === event.pointerId) {
        clearHold();
        holdPointer.current = null;
      }
      const gesture = gesturesRef.current.get(event.pointerId);
      if (!gesture) return;
      gesturesRef.current.delete(event.pointerId);
      const ui = gesture.variant ? variantRef.current : null;
      if (gesture.variant) {
        variantRef.current = null;
        setVariant(null);
      }
      setPop(null);
      setDownId(null);

      if (gesture.kind === "space") {
        if (!gesture.switched && event.type !== "pointercancel") doSpace();
        return;
      }

      if (gesture.variant && ui) {
        dropCommitted(gesture.committed);
        insertChar(ui.selected);
        return;
      }

      const traced = gesture.parts.join("");
      const lettersOnly = /^[\p{L}]+$/u.test(traced);
      const folded = collapseRepeats(traced).length;
      const clearSwipe =
        lettersOnly &&
        ((gesture.ids.length >= 3 && gesture.dist > 46 && folded >= 2) ||
          (gesture.ids.length >= 2 && gesture.dist > 68 && folded >= 2));
      if (!clearSwipe) return;
      const match = bestSwipe(traced, alphaRef.current, learnedRef.current);
      if (!match) return;
      dropCommitted(gesture.committed);
      placeWord(match);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      clearHold();
    };
    // Handlers read the latest editor through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function insertChar(ch: string) {
    insertRaw(shapeChar(ch));
  }

  function onKeyPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    focusEditor();
    const spec = keyByIdRef.current.get(event.currentTarget.dataset.k ?? "");
    if (!spec) return;
    buzz();

    if (spec.action === "space") {
      gesturesRef.current.set(event.pointerId, {
        pointerId: event.pointerId,
        ids: [spec.id],
        parts: [],
        dist: 0,
        lastX: event.clientX,
        lastY: event.clientY,
        originX: event.clientX,
        variant: false,
        kind: "space",
        switched: false,
      });
      setDownId(spec.id);
      return;
    }

    if (spec.action === "backspace") {
      doBackspace();
      clearHold();
      holdPointer.current = event.pointerId;
      holdRef.current = window.setTimeout(() => {
        repeatRef.current = window.setInterval(() => doBackspace(), 42);
      }, 360);
      return;
    }
    if (spec.action) {
      runAction(spec.action);
      return;
    }
    if (!spec.insert) return;

    const shaped = shapeChar(spec.insert);
    insertRaw(shaped);
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerId = event.pointerId;
    gesturesRef.current.set(pointerId, {
      pointerId,
      ids: [spec.id],
      parts: [spec.insert],
      dist: 0,
      lastX: event.clientX,
      lastY: event.clientY,
      originX: event.clientX,
      variant: false,
      kind: "letter",
      switched: false,
      committed: shaped,
    });
    setDownId(spec.id);
    setPop({ x: rect.left + rect.width / 2, y: rect.top, text: spec.label, wide: false });
    window.clearTimeout(longRef.current);
    if (spec.longs?.length) {
      const base = spec.insert;
      const items = [base, ...spec.longs];
      longRef.current = window.setTimeout(() => {
        const gesture = gesturesRef.current.get(pointerId);
        if (!gesture || gesture.kind !== "letter") return;
        gesture.variant = true;
        const ui = { items, selected: base, x: rect.left + rect.width / 2, y: rect.top };
        variantRef.current = ui;
        setVariant(ui);
        setPop(null);
      }, 340);
    }
  }

  const prefix = sel.start === sel.end ? currentToken(text, sel.start).word : "";
  const ideas = useMemo(() => {
    const usable = prefix === "" || /^[\p{L}']+$/u.test(prefix);
    const list = usable ? suggest(prefix, alpha, learned) : [];
    if (list.length === 0 && /^[\p{L}]{2,32}$/u.test(prefix)) {
      return [{ word: prefix, learned: false }];
    }
    return list;
  }, [prefix, alpha, learned]);
  const savedCount = learned.filter((item) => item.count >= 2).length;
  const latestClip = [...clips]
    .filter((clip) => now - clip.at < CLIP_MS)
    .sort((a, b) => b.at - a.at)[0];
  const readyWords = learned
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.last - a.last);
  const onceWords = learned
    .filter((item) => item.count < 2)
    .sort((a, b) => b.last - a.last);
  const ar = alpha === "ar";

  const hint = ar
    ? prefix
      ? "اختر كلمة من الاقتراحات"
      : savedCount === 0
        ? "اكتب حرف ويطلع لك اقتراح الكلمة"
        : "اسحب على الحروف، أو اختر اقتراحاً"
    : prefix
      ? "Tap a suggestion"
      : savedCount === 0
        ? "Type a letter to see word suggestions"
        : "Swipe across letters, or tap a suggestion";

  function renderKey(key: KeyDef) {
    return (
      <button
        key={key.id}
        type="button"
        data-k={key.id}
        aria-label={ariaLabel(key, ar)}
        className={
          "kb-key relative" +
          (key.special ? " is-special" : "") +
          (key.action === "space" ? " is-space" : "") +
          (key.label.length > 1 && !key.action ? " is-pair" : "") +
          (downId === key.id ||
          (key.action === "shift" && shift !== "off") ||
          (key.action === "emoji" && emojiOn)
            ? " is-down"
            : "") +
          (key.action === "shift" && shift !== "off" ? " is-shift" : "")
        }
        style={key.grow ? { flexGrow: key.grow } : undefined}
        onPointerDown={onKeyPointerDown}
        onContextMenu={(event) => event.preventDefault()}
      >
        <KeyFace spec={key} shift={shift} />
      </button>
    );
  }

  const variantLeft = variant
    ? Math.min(
        window.innerWidth - 8 - (variant.items.length * 42 + 8) / 2,
        Math.max(8 + (variant.items.length * 42 + 8) / 2, variant.x),
      )
    : 0;

  return (
    <div className="flex h-dvh justify-center bg-stage">
      <div
        dir={ar ? "rtl" : "ltr"}
        className="kb-shell flex h-full min-h-0 w-full max-w-[480px] flex-col overflow-hidden bg-paper sm:border-x sm:border-line"
      >
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-ink">
                س
              </span>
              <h1 className="text-lg font-semibold tracking-tight">سَلِس</h1>
            </div>
            <p className="mt-1 text-xs text-muted">
              {savedCount === 0
                ? ar
                  ? "يتعلّم الكلمة من التكرار"
                  : "Learns a word from repetition"
                : ar
                  ? `${formatCount(savedCount, "ar")} ${savedCount === 1 ? "كلمة محفوظة" : savedCount === 2 ? "كلمتان محفوظتان" : "كلمات محفوظة"}`
                  : `${savedCount} saved ${savedCount === 1 ? "word" : "words"}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="relative grid size-11 place-items-center rounded-full bg-chip text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
              aria-label={ar ? "النسخ" : "Clipboard"}
              onClick={() => {
                setSheet(false);
                setClipsOn(true);
              }}
            >
              <Clipboard className="size-5" strokeWidth={1.75} />
              {clips.length > 0 ? (
                <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-accent" />
              ) : null}
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full bg-chip text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
              aria-label={ar ? "كلماتك" : "Your words"}
              onClick={() => {
                setClipsOn(false);
                setSheet(true);
              }}
            >
              <BookText className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="relative min-h-16 flex-1 basis-0">
          {clipsOn ? (
            <ClipSheet
              clips={clips}
              now={now}
              ar={ar}
              onClose={() => setClipsOn(false)}
              onUse={(text) => {
                insertRaw(text);
                setClipsOn(false);
              }}
              onPin={setPinned}
              onPull={() => {
                void navigator.clipboard
                  .readText()
                  .then((text) => {
                    if (!text.trim()) {
                      setToast(ar ? "الحافظة فاضية" : "Clipboard is empty");
                      return;
                    }
                    addClip(text);
                  })
                  .catch(() => {
                    setToast(ar ? "الصق النص مرة عشان ينحفظ" : "Paste the text once so it can be saved");
                  });
              }}
            />
          ) : sheet ? (
            <div className="absolute inset-0 z-20 flex flex-col bg-paper">
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <h2 className="text-base font-semibold">{ar ? "كلماتك" : "Your words"}</h2>
                <button
                  type="button"
                  className="grid size-11 place-items-center rounded-full bg-chip text-ink"
                  aria-label={ar ? "إغلاق" : "Close"}
                  onClick={() => setSheet(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="px-4 pb-3 text-sm leading-relaxed text-muted">
                {ar
                  ? "إذا كتبت الكلمة مرتين تثبت هنا ويبدأ الكيبورد يقترحها. اضغط مطولاً على الحرف للشكل الثاني، وعلى الرقم للرقم العربي."
                  : "Type a word twice and it stays here, then the keyboard suggests it. Long-press a letter for variants, or a number for Arabic digits."}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                {readyWords.length === 0 && onceWords.length === 0 ? (
                  <p className="pt-6 text-sm text-muted">
                    {ar ? "ما فيه كلمات بعد. اكتب أي كلمة مرتين." : "No words yet. Type anything twice."}
                  </p>
                ) : null}
                {readyWords.length > 0 ? (
                  <WordGroup
                    title={ar ? "يقترحها" : "Suggested"}
                    words={readyWords}
                    ar={ar}
                    onUse={(word) => {
                      placeWord(word);
                      setSheet(false);
                    }}
                    onForget={forget}
                  />
                ) : null}
                {onceWords.length > 0 ? (
                  <WordGroup
                    title={ar ? "مرة واحدة — كرّرها" : "Once — type again"}
                    words={onceWords}
                    ar={ar}
                    onUse={(word) => {
                      placeWord(word);
                      setSheet(false);
                    }}
                    onForget={forget}
                  />
                ) : null}
              </div>
              <div className="px-4 py-3">
                <button
                  type="button"
                  className="h-11 w-full rounded-xl bg-chip text-sm text-ink"
                  onClick={() => {
                    commitEdit("", 0);
                    setSheet(false);
                  }}
                >
                  {ar ? "مسح المسودة" : "Clear note"}
                </button>
              </div>
            </div>
          ) : (
            <textarea
              ref={areaRef}
              value={text}
              dir="auto"
              inputMode="none"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                ar
                  ? "اكتب هنا… الكيبورد يقترح، ويحفظ الكلمة إذا كررتها"
                  : "Write here… suggestions appear as you type, and a repeated word is remembered"
              }
              className="h-full w-full resize-none bg-transparent px-4 py-2 text-xl leading-relaxed text-ink outline-none placeholder:text-sm placeholder:leading-relaxed placeholder:text-muted"
              onChange={(event) => {
                const next = event.target.value;
                const start = event.target.selectionStart ?? next.length;
                const end = event.target.selectionEnd ?? start;
                textRef.current = next;
                selRef.current = { start, end };
                setText(next);
                setSel(selRef.current);
              }}
              onSelect={(event) => {
                const start = event.currentTarget.selectionStart ?? 0;
                const end = event.currentTarget.selectionEnd ?? start;
                selRef.current = { start, end };
                setSel({ start, end });
              }}
              onKeyUp={(event) => {
                if (event.key !== " " && event.key !== "Enter" && !isBoundary(event.key)) return;
                const el = event.currentTarget;
                const caret = el.selectionStart ?? 0;
                let index = caret;
                let skipped = 0;
                while (index > 0 && isBoundary(el.value[index - 1] ?? "") && skipped < 3) {
                  index -= 1;
                  skipped += 1;
                }
                if (skipped === 0) return;
                const token = currentToken(el.value, index);
                if (token.word) remember(token.word);
              }}
            />
          )}
          {toast && !sheet ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <div className="kb-toast rounded-full border border-line bg-chip px-4 py-2 text-sm text-accent">
                {toast}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-board">
          <div className="kb-suggest flex h-11 items-stretch overflow-x-auto border-b border-line" dir={ar ? "rtl" : "ltr"}>
            {latestClip ? (
              <button
                type="button"
                className="flex h-full max-w-[58%] shrink-0 items-center gap-1.5 bg-accent px-3 text-sm font-semibold text-accent-ink"
                onPointerDown={(event) => {
                  event.preventDefault();
                  focusEditor();
                  insertRaw(latestClip.text);
                }}
              >
                <span className="shrink-0">{ar ? "لصق" : "Paste"}</span>
                <span className="truncate font-normal" dir="auto">
                  {clipPreview(latestClip.text)}
                </span>
              </button>
            ) : null}
            {latestClip ? (
              <button
                type="button"
                className="flex h-full shrink-0 items-center border-s border-line px-3 text-sm text-ink"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setSheet(false);
                  setClipsOn(true);
                }}
              >
                {ar ? "٣ دقايق" : "3 min"}
              </button>
            ) : null}
            {ideas.length === 0 ? (
              <p className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-muted">
                {hint}
              </p>
            ) : (
              ideas.map((sug, index) => (
                <button
                  key={sug.word}
                  type="button"
                  className={
                    "relative flex h-full shrink-0 items-center justify-center px-3 text-ink active:bg-chip " +
                    (index === 0 ? "text-base font-semibold" : "text-sm font-normal")
                  }
                  onPointerDown={(event) => {
                    event.preventDefault();
                    focusEditor();
                    placeWord(sug.word);
                  }}
                >
                  <span className="truncate" dir="auto">
                    {sug.word}
                  </span>
                  {sug.learned ? (
                    <span className="absolute top-1.5 size-1.5 rounded-full bg-accent" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
          </div>
          <div
            className="kb-board kb-pad"
            onContextMenu={(event) => event.preventDefault()}
          >
            {emojiOn ? (
              <div className="flex h-[14.6rem] flex-col">
                <div className="flex gap-1 overflow-x-auto px-1 pb-1">
                  {EMOJI_GROUPS.map((group, index) => (
                    <button
                      key={group.id}
                      type="button"
                      className={
                        "grid size-9 shrink-0 place-items-center rounded-lg text-lg " +
                        (emojiCat === index ? "bg-down" : "bg-special")
                      }
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setEmojiCat(index);
                      }}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-8 content-start gap-1 overflow-y-auto px-1">
                  {EMOJI_GROUPS[emojiCat]?.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="h-10 rounded-lg text-2xl active:bg-chip"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        focusEditor();
                        buzz();
                        insertRaw(item);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              rows.slice(0, -1).map((row) => (
                <div key={row.keys.map((key) => key.id).join("-")} className="kb-row" dir={row.dir}>
                  {row.keys.map((key) => renderKey(key))}
                </div>
              ))
            )}
            {rows.slice(-1).map((row) => (
              <div key="bottom" className="kb-row" dir={row.dir}>
                {row.keys.map((key) => renderKey(key))}
              </div>
            ))}
          </div>
        </div>
        <div className="kb-dock" dir="ltr">
          <button
            type="button"
            className="kb-dock-btn"
            aria-label={ar ? "تغيير اللغة" : "Switch language"}
            onPointerDown={(event) => {
              event.preventDefault();
              focusEditor();
              buzz();
              switchLang();
            }}
          >
            <Globe className="size-7" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            className={"kb-dock-btn" + (listening ? " is-on" : "")}
            aria-label={ar ? "مايك" : "Microphone"}
            aria-pressed={listening}
            onPointerDown={(event) => {
              event.preventDefault();
              focusEditor();
              buzz();
              toggleMic();
            }}
          >
            <Mic className="size-7" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {pop ? (
        <div className={"kb-pop" + (pop.wide ? " is-wide" : "")} style={{ left: pop.x, top: pop.y }}>
          {pop.text}
        </div>
      ) : null}
      {variant ? (
        <div className="kb-variants" style={{ left: variantLeft, top: variant.y }}>
          {variant.items.map((item) => (
            <button
              key={item}
              type="button"
              data-variant={item}
              className={"kb-variant" + (variant.selected === item ? " is-on" : "")}
              onPointerDown={(event) => event.preventDefault()}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KeyFace({ spec, shift }: { spec: KeyDef; shift: Shift }) {
  if (spec.action === "backspace") return <Delete className="mx-auto size-5" strokeWidth={1.75} />;
  if (spec.action === "emoji") return <Smile className="mx-auto size-5" strokeWidth={1.75} />;
  if (spec.action === "return") return <CornerDownLeft className="mx-auto size-5" strokeWidth={1.75} />;
  if (spec.action === "shift") {
    return (
      <span className="relative mx-auto block w-fit">
        <ArrowBigUp
          className={shift === "off" ? "size-5" : "size-5 fill-current"}
          strokeWidth={1.75}
        />
        {shift === "caps" ? (
          <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-current" />
        ) : null}
      </span>
    );
  }
  if (spec.action === "space") {
    return (
      <span className="flex w-full items-center justify-center gap-3" dir="ltr">
        <span className="opacity-60">‹</span>
        <span>{spec.label}</span>
        <span className="opacity-60">›</span>
      </span>
    );
  }
  return spec.label;
}

function ariaLabel(spec: KeyDef, ar: boolean) {
  if (spec.action === "backspace") return ar ? "حذف" : "Delete";
  if (spec.action === "return") return ar ? "سطر جديد" : "New line";
  if (spec.action === "space") return ar ? "مسافة، اسحب يمين أو يسار لتغيير اللغة" : "Space, swipe to switch language";
  if (spec.action === "emoji") return ar ? "إيموجي" : "Emoji";
  if (spec.action === "shift") return ar ? "تحويل" : "Shift";
  if (spec.action === "lang") return ar ? "إنجليزي" : "Arabic";
  if (spec.action === "mode" || spec.action === "modeAlt") return spec.label;
  return spec.label;
}

function WordGroup({
  title,
  words,
  ar,
  onUse,
  onForget,
}: {
  title: string;
  words: LearnedWord[];
  ar: boolean;
  onUse: (word: string) => void;
  onForget: (word: string, lang: Lang) => void;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-1 text-xs text-muted">{title}</h3>
      <ul>
        {words.map((item) => (
          <li key={`${item.lang}:${item.word}`} className="flex items-center gap-2 border-b border-line">
            <button type="button" className="min-w-0 flex-1 py-3 text-start" onClick={() => onUse(item.word)}>
              <span className="block truncate text-base" dir="auto">
                {item.word}
              </span>
              <span className="text-xs text-muted">
                {ar ? `${formatCount(item.count, "ar")} مرات` : `${item.count}×`}
              </span>
            </button>
            <button
              type="button"
              className="h-11 shrink-0 rounded-lg px-3 text-sm text-muted"
              onClick={() => onForget(item.word, item.lang)}
            >
              {ar ? "نسيان" : "Forget"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type SpeechAlt = { transcript: string };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results?: ArrayLike<ArrayLike<SpeechAlt>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function speechCtor(): (new () => SpeechRec) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

const CLIP_MS = 3 * 60 * 1000;

function clipPreview(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 24 ? `${flat.slice(0, 24)}…` : flat;
}
const CLIPS_KEY = "salees.clips";

type Clip = { id: string; text: string; pinned: boolean; at: number };

function loadClips(): Clip[] {
  try {
    const raw = localStorage.getItem(CLIPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Clip[];
    if (!Array.isArray(data)) return [];
    const stamp = Date.now();
    return data.filter(
      (clip) =>
        clip &&
        typeof clip.id === "string" &&
        typeof clip.text === "string" &&
        clip.text.trim() &&
        (clip.pinned === true || (typeof clip.at === "number" && stamp - clip.at < CLIP_MS)),
    );
  } catch {
    return [];
  }
}

function saveClips(clips: Clip[]) {
  try {
    localStorage.setItem(CLIPS_KEY, JSON.stringify(clips));
  } catch {
    /* ignore quota */
  }
}

function ClipSheet({
  clips,
  now,
  ar,
  onClose,
  onUse,
  onPin,
  onPull,
}: {
  clips: Clip[];
  now: number;
  ar: boolean;
  onClose: () => void;
  onUse: (text: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onPull: () => void;
}) {
  const pinned = clips.filter((clip) => clip.pinned);
  const fresh = clips.filter((clip) => !clip.pinned);
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-paper">
      <div className="flex items-center justify-between px-4 pt-1 pb-2">
        <h2 className="text-base font-semibold">{ar ? "النسخ" : "Clipboard"}</h2>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-chip text-ink"
          aria-label={ar ? "إغلاق" : "Close"}
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>
      <p className="px-4 pb-3 text-sm leading-relaxed text-muted">
        {ar
          ? "أي نص تنسخه يبقى هنا ثلاث دقايق. اضغطه للصق، أو ثبّته إذا تبيه يبقى."
          : "Copies stay here for three minutes. Tap one to paste, or pin it to keep it."}
      </p>
      <div className="px-4 pb-3">
        <button type="button" className="h-11 w-full rounded-xl bg-chip text-sm text-ink" onClick={onPull}>
          {ar ? "احفظ اللي في الحافظة" : "Save what's on the clipboard"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {clips.length === 0 ? (
          <p className="pt-4 text-sm text-muted">
            {ar ? "ما فيه نسخ بعد. انسخ نص أو الصقه هنا." : "Nothing copied yet. Copy or paste some text."}
          </p>
        ) : null}
        {pinned.length > 0 ? (
          <ClipGroup title={ar ? "مثبّت" : "Pinned"} clips={pinned} now={now} ar={ar} onUse={onUse} onPin={onPin} />
        ) : null}
        {fresh.length > 0 ? (
          <ClipGroup title={ar ? "آخر ٣ دقايق" : "Last 3 minutes"} clips={fresh} now={now} ar={ar} onUse={onUse} onPin={onPin} />
        ) : null}
      </div>
    </div>
  );
}

function ClipGroup({
  title,
  clips,
  now,
  ar,
  onUse,
  onPin,
}: {
  title: string;
  clips: Clip[];
  now: number;
  ar: boolean;
  onUse: (text: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-1 text-xs text-muted">{title}</h3>
      <ul>
        {clips.map((clip) => {
          const left = Math.max(0, Math.ceil((CLIP_MS - (now - clip.at)) / 1000));
          return (
            <li key={clip.id} className="flex items-center gap-2 border-b border-line">
              <button type="button" className="min-w-0 flex-1 py-3 text-start" onClick={() => onUse(clip.text)}>
                <span className="block truncate text-base" dir="auto">
                  {clip.text}
                </span>
                <span className="text-xs text-muted">
                  {clip.pinned
                    ? ar
                      ? "مثبّت"
                      : "Pinned"
                    : left >= 60
                      ? ar
                        ? `يبقى ${Math.ceil(left / 60)} د`
                        : `${Math.ceil(left / 60)} min left`
                      : ar
                        ? `يبقى ${left} ث`
                        : `${left}s left`}
                </span>
              </button>
              <button
                type="button"
                className={"grid size-11 shrink-0 place-items-center rounded-lg " + (clip.pinned ? "text-accent" : "text-muted")}
                aria-label={clip.pinned ? (ar ? "إلغاء التثبيت" : "Unpin") : ar ? "تثبيت" : "Pin"}
                onClick={() => onPin(clip.id, !clip.pinned)}
              >
                <Pin className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
