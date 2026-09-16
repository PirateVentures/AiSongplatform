"use client";

import { useState } from "react";

const INVITE_PATH = "/create?from=gift&utm_source=song_gift&utm_medium=share_friend&promo=GIFTALONG";

/**
 * Under-lyrics gift reward on paid /song.
 * Soft cohesion with the QR keepsake — pass a free first song, not a referral funnel.
 */
export function ShareFriendCta() {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function shareFriend() {
    setBusy(true);
    setNote("");
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${INVITE_PATH}`
        : `https://songsnuggle.com${INVITE_PATH}`;
    const text =
      "Someone you love might need a song too. Your first SongSnuggle is on us — use code GIFTALONG:";
    try {
      const payload = { title: "A song they can keep", text, url };
      if (typeof navigator.share === "function" && navigator.canShare?.(payload)) {
        await navigator.share(payload);
        setNote("Sent with love.");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Ready to paste in a text.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setNote("Link copied — paste it whenever you're ready.");
      } catch {
        setNote("Open songsnuggle.com and make one for someone you love.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--copper)]/30 bg-gradient-to-br from-[#fffaf2] to-[#eef3ee] p-5 shadow-[0_10px_28px_rgba(60,40,20,0.06)] md:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--copper)]">
        Because this meant something
      </p>
      <h3 className="serif mt-2 text-2xl text-[var(--ink)]">
        Send someone a free first song
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        The keepsake you just got was made to be passed along. Share this with a
        friend — their first song is on us, same warm feeling.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={shareFriend}
          disabled={busy}
          className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white disabled:opacity-60"
        >
          {busy ? "One moment…" : "Send them a free song"}
        </button>
        <a
          className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm"
          href={INVITE_PATH}
        >
          Start one for them
        </a>
      </div>
      {note ? (
        <p className="mt-3 text-sm text-[var(--copper-dark)]" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}
