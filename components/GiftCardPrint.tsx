"use client";

import { useCallback, useEffect, useState } from "react";
import { GIFT_CARD_QR_ID } from "@/lib/gift-card-id";
import type { PublicSongJob } from "@/lib/types";

/**
 * Printable / shareable gift card for GiftDeliveryTemplate.qrPrintSlot.
 * Photo (optional) + message + QR deep-link — linen / forest / copper.
 * Mobile: primary Share gift card action (Web Share API with PNG when available).
 */
export function GiftCardPrint({ job }: { job: PublicSongJob }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewBust, setPreviewBust] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState("");
  const unlockPath = `/song/${job.id}`;
  const pdfHref = `/api/jobs/${job.id}/gift-card.pdf`;
  const pngHref = `/api/jobs/${job.id}/gift-card.png`;
  const printHref = `/song/${job.id}/gift-card`;

  useEffect(() => {
    let active = true;
    fetch(`/api/jobs/${job.id}/gift-photo`)
      .then(async (res) => {
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      })
      .then((url) => {
        if (active && url) setPhotoUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [job.id, previewBust]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const onPhoto = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setNote("Choose a photo (JPG or PNG).");
        return;
      }
      if (file.size > 4_500_000) {
        setNote("Keep the photo under about 4.5 MB.");
        return;
      }
      setBusy(true);
      setNote("");
      try {
        const body = new FormData();
        body.append("photo", file);
        const res = await fetch(`/api/jobs/${job.id}/gift-photo`, {
          method: "POST",
          body,
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Could not save photo.");
        setPreviewBust((n) => n + 1);
        setNote("Photo saved on the card.");
      } catch (err) {
        setNote(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [job.id],
  );

  const copyPrivateLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : unlockPath;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      input.setAttribute("readonly", "true");
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
  }, [unlockPath]);

  const shareGiftCard = useCallback(async () => {
    setSharing(true);
    setNote("");
    try {
      const res = await fetch(`${pngHref}?t=${Date.now()}`);
      if (!res.ok) throw new Error("Could not load the gift card image.");
      const blob = await res.blob();
      const fileName = `songsnuggle-gift-${job.id.slice(0, 8)}.png`;
      const file = new File([blob], fileName, { type: blob.type || "image/png" });
      const shareText = `A keepsake song for ${(job.recipientName || "someone special").trim()}.`;

      const withFiles = { files: [file], title: "SongSnuggle gift card", text: shareText };
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(withFiles);

      if (canShareFiles && typeof navigator.share === "function") {
        await navigator.share(withFiles);
        setNote("Ready to send — pick Messages, Mail, or whoever should have it.");
        return;
      }

      // Fallback: download PNG + copy private link (iPhone Safari without file share)
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
      await copyPrivateLink();
      setNote("Saved the card image and copied the page link.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setNote("");
        return;
      }
      try {
        await copyPrivateLink();
        setNote("Copied the page link — you can still save the card image below.");
      } catch {
        setNote(err instanceof Error ? err.message : "Could not share just now.");
      }
    } finally {
      setSharing(false);
    }
  }, [copyPrivateLink, job.id, job.recipientName, pngHref]);

  const from = (job.senderName || "").trim();
  const written = (job.recipientName || "someone special").trim();
  const message =
    (job.message || "").trim() ||
    "A keepsake song — scan whenever you want to hear it again.";
  const title = (job.songTitle || "").trim() || `A song for ${written}`;

  return (
    <div className="space-y-5">
      <p className="text-[var(--muted)]">
        Add a photo and a note, then send the card — or print it for the box or bag.
      </p>

      {/* Primary mobile (+ desktop) share action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={shareGiftCard}
          disabled={sharing || busy}
          className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white disabled:opacity-60"
        >
          {sharing ? "Preparing…" : "Send gift card"}
        </button>
        <label className="cursor-pointer rounded-full border border-[var(--line)] bg-white px-5 py-3 text-center text-sm">
          {busy ? "Saving photo…" : photoUrl ? "Change photo" : "Add a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy || sharing}
            onChange={(event) => onPhoto(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
          href={pngHref}
          download
        >
          Save card image
        </a>
        <a
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm"
          href={pdfHref}
        >
          Save as PDF
        </a>
        <a
          className="rounded-full border border-[var(--copper)]/40 bg-[#f8e7db] px-4 py-2.5 text-sm text-[var(--copper-dark)]"
          href={printHref}
          target="_blank"
          rel="noreferrer"
        >
          Print card
        </a>
      </div>
      {note ? <p className="text-sm text-[var(--copper-dark)]">{note}</p> : null}

      {/* Live preview — same structure as print sheet */}
      <article
        id={GIFT_CARD_QR_ID}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-gradient-to-b from-[#fffaf2] to-[#f4efe4] shadow-[0_16px_40px_rgba(60,40,20,0.08)]"
      >
        <div className="space-y-4 p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--copper)]">
              SongSnuggle
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">A song they can keep.</p>
          </div>

          <div className="photo-frame aspect-[4/3] bg-[#eef3ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl || "/brand/mood-listen.png"}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h3 className="serif text-2xl text-[var(--ink)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              For {written}
              {from ? <> · From {from}</> : null}
            </p>
            <p className="mt-3 text-[var(--ink)] leading-relaxed">{message}</p>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-[var(--line)] pt-4">
            <div className="text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--copper)]">
                Open their song
              </p>
              <p className="mt-1 font-medium text-[var(--ink)]">whenever they want</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Tuck this card in the box or bag.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/jobs/${job.id}/gift-card.png?t=${previewBust}`}
              alt={`QR to ${unlockPath}`}
              width={96}
              height={96}
              className="rounded-xl border border-[var(--copper)]/40 bg-[#fffaf2] p-1"
            />
          </div>
        </div>
      </article>
    </div>
  );
}
