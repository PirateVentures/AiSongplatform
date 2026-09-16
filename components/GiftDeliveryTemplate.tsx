"use client";

import type { ReactNode } from "react";
import { LyricAudio } from "@/components/LyricAudio";
import { SongDelivery } from "@/components/SongDelivery";
import { ShareFriendCta } from "@/components/ShareFriendCta";
import type { LyricCue } from "@/lib/cues";
import type { PublicSongJob } from "@/lib/types";

/**
 * Shared gift delivery layout for every paid /song page (and post-pay deep-links).
 * Linen / forest / copper present chrome — gift feeling, not tool UI.
 *
 * Desktop (md+): player + lyrics sit beside the gift QR card in one viewport.
 * Mobile: stack; QR card carries Share / Send.
 */
export function GiftDeliveryTemplate({
  job,
  audioSrc,
  cues,
  encodedDurationSec,
  emailSlot,
  qrPrintSlot,
}: {
  job: PublicSongJob;
  audioSrc: string;
  cues: LyricCue[];
  encodedDurationSec?: number | null;
  /** Hook for branded delivery email preview / CTA */
  emailSlot?: ReactNode;
  /** Hook for QR print / share card — primary on desktop */
  qrPrintSlot?: ReactNode;
}) {
  const from = (job.senderName || "").trim();
  // Written gift-card name only — pronunciation is sing-only, never display chrome.
  const written = (job.recipientName || "").trim();
  const displayTitle =
    (job.songTitle || "").trim() ||
    (written ? `For ${written}` : "Your song");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--copper)]">
          Your gift is ready
        </p>
        <h1 className="serif text-4xl text-[var(--ink)]">{displayTitle}</h1>
        <div className="text-[var(--muted)]">
          <p>
            Made for <span className="text-[var(--ink)]">{written || "someone special"}</span>
            {from ? <> · From {from}</> : null}
          </p>
        </div>
        <p className="pt-1 text-[var(--muted)]">
          Play it whenever you like. Send the gift card, keep the MP3 for your phone
          {job.email ? (
            <>
              {" "}— and we&apos;ll email this private page to{" "}
              <span className="text-[var(--ink)]">{job.email}</span>
            </>
          ) : null}
          .
        </p>
      </header>

      {/* md+: player | QR gift card side-by-side in one viewport */}
      <div
        className={
          qrPrintSlot
            ? "grid gap-6 md:grid-cols-2 md:items-start md:gap-8"
            : undefined
        }
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-gradient-to-b from-[#fff8f1] via-[#f7f1e8] to-[#eef3ee] p-1 shadow-[0_18px_50px_rgba(60,40,20,0.08)]">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 backdrop-blur-sm md:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--copper)]">
                    A song they can keep
                  </p>
                  <h2 className="serif mt-2 text-2xl text-[var(--ink)]">{displayTitle}</h2>
                </div>
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--copper)]/30 bg-[#f8e7db] text-[var(--copper-dark)]"
                >
                  ♡
                </span>
              </div>

              <LyricAudio
                gift
                jobId={job.id}
                title={displayTitle}
                src={audioSrc}
                cues={cues}
                fallbackLyrics={job.lyrics}
                encodedDurationSec={encodedDurationSec}
                /* full/unlocked: never pass maxPlaySeconds */
              />
            </div>
          </div>

          <ShareFriendCta jobId={job.id} />
        </div>

        {qrPrintSlot ? (
          <aside className="overflow-hidden rounded-[1.75rem] border border-[var(--copper)]/35 bg-gradient-to-b from-[#fffaf2] via-[#f7f1e8] to-[#eef3ee] p-1 shadow-[0_18px_50px_rgba(60,40,20,0.1)] md:sticky md:top-6">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/60 p-5 backdrop-blur-sm md:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--copper)]">
                    Their keepsake card
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Tuck it in a box, text it, or print it for the bag.
                  </p>
                </div>
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--copper)]/30 bg-[#eef3ee] text-[var(--copper-dark)]"
                >
                  ♡
                </span>
              </div>
              {qrPrintSlot}
            </div>
          </aside>
        ) : null}
      </div>

      {/* Keep / download nearby — must not bury QR on laptop heights */}
      <SongDelivery job={job} />

      {emailSlot ? (
        <section className="rounded-3xl border border-dashed border-[var(--line)] bg-white/50 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--copper)]">
            We'll email this page
          </p>
          <div className="mt-3">{emailSlot}</div>
        </section>
      ) : null}
    </div>
  );
}
