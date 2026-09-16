"use client";

import { useState } from "react";

type Props = {
  jobId: string;
};

/**
 * Under-lyrics gift reward on paid /song.
 * Mints a one-time free-song coupon and shares it with warm gift energy.
 */
export function ShareFriendCta({ jobId }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [giftLink, setGiftLink] = useState("");
  const [lastCode, setLastCode] = useState("");

  async function mintInvite(): Promise<{ code: string; url: string } | null> {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/gift-share`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
      invitePath?: string;
      error?: string;
    };
    if (!response.ok || !data.code || !data.invitePath) {
      throw new Error(data.error || "Could not prepare your gift.");
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://songsnuggle.com";
    return { code: data.code, url: `${origin}${data.invitePath}` };
  }

  function shareText(code: string) {
    return `Feeling loved? I'm sending you a FREE SongSnuggle song — a gift. Use code ${code}:`;
  }

  async function shareFriend() {
    setBusy(true);
    setNote("");
    try {
      const minted = await mintInvite();
      if (!minted) throw new Error("Could not prepare your gift.");
      setLastCode(minted.code);
      setGiftLink(minted.url);
      const text = shareText(minted.code);
      const payload = {
        title: "A free SongSnuggle song for you",
        text,
        url: minted.url,
      };
      if (typeof navigator.share === "function" && navigator.canShare?.(payload)) {
        await navigator.share(payload);
        setNote("Gift ready to send.");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${minted.url}`);
      setNote("Gift ready to send — link copied.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not prepare your gift.";
      // User cancelled native share — still a warm success if we minted.
      if (
        error instanceof Error &&
        (error.name === "AbortError" || /cancel/i.test(error.message))
      ) {
        setNote("Gift ready to send.");
        return;
      }
      try {
        if (giftLink) {
          await navigator.clipboard.writeText(giftLink);
          setNote("Gift link copied — paste it whenever you're ready.");
          return;
        }
      } catch {
        /* fall through */
      }
      setNote(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyGiftLink() {
    setBusy(true);
    setNote("");
    try {
      let url = giftLink;
      let code = lastCode;
      if (!url) {
        const minted = await mintInvite();
        if (!minted) throw new Error("Could not prepare your gift.");
        url = minted.url;
        code = minted.code;
        setGiftLink(url);
        setLastCode(code);
      }
      await navigator.clipboard.writeText(`${shareText(code)} ${url}`);
      setNote("Gift ready to send — link copied.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not copy gift link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--copper)]/30 bg-gradient-to-br from-[#fffaf2] to-[#eef3ee] p-5 shadow-[0_10px_28px_rgba(60,40,20,0.06)] md:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--copper)]">
        Feeling loved?
      </p>
      <h3 className="serif mt-2 text-2xl text-[var(--ink)]">
        Share with a friend and give the GIFT of a FREE SONG!
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Pass the warmth along — they get one free SongSnuggle, just for them.
        One gift, one friend, made to feel like love.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={shareFriend}
          disabled={busy}
          className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Warming up…" : "Share a free song"}
        </button>
        <button
          type="button"
          onClick={copyGiftLink}
          disabled={busy}
          className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm disabled:opacity-60"
        >
          Copy gift link
        </button>
      </div>
      {note ? (
        <p className="mt-3 text-sm text-[var(--copper-dark)]" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}
