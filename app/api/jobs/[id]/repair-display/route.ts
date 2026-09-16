import { NextResponse } from "next/server";
import { lintLyricCues, lintLyricText } from "@/lib/lyric-lint";
import { getJob, publicJob, updateJob } from "@/lib/store";
import type { LyricCue } from "@/lib/cues";

/**
 * Secret-gated display repair: written name, lyrics lint, cue text.
 * Does NOT wipe paid/fullReady/previewReady — Atlas gift-path hotfixes only.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const secret = process.env.REPAIR_SECRET || process.env.ADMIN_REPAIR_SECRET || "";
  const header = request.headers.get("x-repair-secret") || "";
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    recipientName?: string;
    namePronunciation?: string;
    songTitle?: string;
    lyrics?: string;
    lyricCues?: LyricCue[];
    applyLint?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.recipientName === "string" && body.recipientName.trim()) {
    patch.recipientName = body.recipientName.trim().slice(0, 120);
  }
  if (typeof body.namePronunciation === "string") {
    patch.namePronunciation = body.namePronunciation.trim().slice(0, 120);
  }
  if (typeof body.songTitle === "string") {
    patch.songTitle = body.songTitle.trim().slice(0, 160);
  }

  let lyrics = typeof body.lyrics === "string" ? body.lyrics : job.lyrics;
  let cues: LyricCue[] = Array.isArray(body.lyricCues)
    ? body.lyricCues
    : job.lyricCues || [];

  const applyLint = body.applyLint !== false;
  if (applyLint) {
    const lintedCues = lintLyricCues(cues);
    cues = lintedCues.cues;
    const lintedText = lintLyricText(lyrics || "");
    lyrics = lintedText.text;
    if (lintedCues.fixes.length || lintedText.fixes.length) {
      console.info("[repair-display] lint", {
        id,
        cueFixes: lintedCues.fixes,
        textFixes: lintedText.fixes,
      });
    }
  }

  if (typeof body.lyrics === "string" || applyLint) {
    patch.lyrics = lyrics;
  }
  if (Array.isArray(body.lyricCues) || applyLint) {
    patch.lyricCues = cues;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to patch." }, { status: 400 });
  }

  const next = await updateJob(id, patch);
  return NextResponse.json({
    ok: true,
    patched: Object.keys(patch),
    job: publicJob(next || job),
  });
}
