"use client";

import { useState } from "react";

const INVITE_PATH = "/create?from=gift&utm_source=song_gift&utm_medium=share_friend";

/**
 * Fills dead space under the lyrics on paid /song (desktop).
 * Soft referral: share a friend invite to make a keepsake song.
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
      "A song they can keep — make one for someone you love:";
    try {
      const payload = { title: "SongSnuggle for a friend", text, url };
      if (typeof navigator.share === "function" && navigator.canShare?.(payload)) {
        await navigator.share(payload);
        setNote("Invite shared.");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Invite copied — paste it in a text.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setNote("Link copied.");
      } catch {
        setNote("Open songsnuggle.com/create and share it with a friend.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--copper)]/30 bg-gradient-to-br from-[#fffaf2] to-[#eef3ee] p-5 shadow-[0_10px_28px_rgba(60,40,20,0.06)] md:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--copper)]">
        Pass it on
      </p>
      <h3 className="serif mt-2 text-2xl text-[var(--ink)]">
        Know someone else who needs a song?
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Send them a friend invite to make theirs. A little gift, passed along —
        same warm keepsake feeling you just got.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={shareFriend}
          disabled={busy}
          className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Preparing…" : "Share with a friend"}
        </button>
        <a
          className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm"
          href={INVITE_PATH}
        >
          Open invite
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
