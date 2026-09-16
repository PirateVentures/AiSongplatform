/**
 * Written gift-card name vs optional pronunciation guide.
 * Display / title / meta / OG / email ALWAYS use recipientName (written).
 * namePronunciation is sing-only (EL styles / lyric prompt) — never display meta.
 */

export type NameFields = {
  recipientName?: string | null;
  namePronunciation?: string | null;
  songTitle?: string | null;
};

/** Gift-card / title / meta spelling — never pronunciation. */
export function writtenDisplayName(job: NameFields, fallback = "someone special"): string {
  const written = (job.recipientName || "").trim();
  return written || fallback;
}

/** First written token for short titles. */
export function writtenFirstName(job: NameFields, fallback = ""): string {
  const written = writtenDisplayName(job, "").trim();
  if (!written) return fallback;
  return written.split(/\s+/)[0] || fallback;
}

/** Soft gift title — prefers songTitle, else "For {written}". */
export function giftDisplayTitle(job: NameFields, fallback = "Your song"): string {
  const title = (job.songTitle || "").trim();
  if (title) return title;
  const written = writtenDisplayName(job, "");
  return written ? `For ${written}` : fallback;
}

/** Sing-only pronunciation guide; empty when absent or identical to written. */
export function singPronunciationGuide(job: NameFields): string {
  const guide = (job.namePronunciation || "").trim();
  if (!guide) return "";
  const written = (job.recipientName || "").trim();
  if (guide.toLowerCase() === written.toLowerCase()) return "";
  return guide;
}
