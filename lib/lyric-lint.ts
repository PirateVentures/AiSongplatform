/**
 * Lightweight lyric lint before publish — catch common LLM slips
 * (let/led, etc.) so gift display never ships broken grammar.
 */

export type LyricLintFix = {
  before: string;
  after: string;
  rule: string;
};

const LINE_RULES: {
  rule: string;
  re: RegExp;
  replace: string | ((...args: string[]) => string);
}[] = [
  {
    rule: "let→led (past tense path/road)",
    // "has let us to Japan" / "road that let us to" / "which let me to"
    re: /\b(has|have|had|that|which|road|path|way)\s+let\s+(us|me|you|them|him|her)\s+to\b/gi,
    replace: (_m: string, lead: string, who: string) => `${lead} led ${who} to`,
  },
  {
    rule: "let→led (bare past)",
    re: /\blet\s+(us|me|you|them)\s+to\b/gi,
    replace: (_m: string, who: string) => `led ${who} to`,
  },
];

/** Apply deterministic grammar fixes; returns fixed text + list of changes. */
export function lintLyricText(input: string): { text: string; fixes: LyricLintFix[] } {
  let text = input || "";
  const fixes: LyricLintFix[] = [];
  for (const { rule, re, replace } of LINE_RULES) {
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const match = text.match(re);
    const next = text.replace(re, replace as never);
    if (next !== text) {
      fixes.push({
        before: match?.[0] || "(match)",
        after: (match?.[0] || "").replace(
          new RegExp(re.source, re.flags),
          replace as never,
        ),
        rule,
      });
      text = next;
    }
  }
  return { text, fixes };
}

/** True when text still contains known let/led (or similar) slips. */
export function lyricLintFails(input: string): string[] {
  const fails: string[] = [];
  for (const { rule, re } of LINE_RULES) {
    re.lastIndex = 0;
    if (re.test(input || "")) fails.push(rule);
  }
  return fails;
}

type CueWord = { text: string; start: number; end: number };

/** Lint cue display text; flip matching let→led word tokens only. */
export function lintLyricCues<T extends { text?: string; words?: CueWord[] }>(
  cues: T[],
): { cues: T[]; fixes: LyricLintFix[] } {
  const fixes: LyricLintFix[] = [];
  const out = (cues || []).map((c) => {
    const raw = c.text || "";
    const { text, fixes: lineFixes } = lintLyricText(raw);
    if (lineFixes.length) fixes.push(...lineFixes);
    if (text === raw) return c;
    const words = (c.words || []).map((w, i, arr) => {
      if (!/^let$/i.test(w.text || "")) return w;
      const prev = (arr[i - 1]?.text || "").toLowerCase();
      const next = (arr[i + 1]?.text || "").toLowerCase();
      const after = (arr[i + 2]?.text || "").toLowerCase();
      const leadOk = /^(has|have|had|that|which|road|path|way)$/.test(prev);
      const whoOk = /^(us|me|you|them|him|her)$/.test(next);
      const toOk = after === "to" || next === "to" || whoOk;
      if ((leadOk && whoOk) || (whoOk && toOk) || (whoOk && /^to$/i.test(after))) {
        const led = w.text[0] === "L" ? "Led" : "led";
        return { ...w, text: led };
      }
      // Bare "let us to"
      if (whoOk && /^to$/i.test(after)) {
        return { ...w, text: w.text[0] === "L" ? "Led" : "led" };
      }
      return w;
    });
    return { ...c, text, words };
  });
  return { cues: out, fixes };
}
