import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { brand } from "@/lib/brand";

const siteUrl = process.env.APP_URL || "https://songsnuggle.com";
const pageUrl = `${siteUrl}/birthday`;
const createHref = "/create?occasion=birthday&utm_campaign=ss_seo_birthday";

export const metadata: Metadata = {
  title: "Personalized birthday song gift | SongSnuggle",
  description:
    "A birthday song with their name in it. Free preview, then a keepsake recording to send.",
  alternates: {
    canonical: "/birthday",
  },
  openGraph: {
    title: "Personalized birthday song gift | SongSnuggle",
    description:
      "A birthday song with their name in it. Free preview, then a keepsake recording to send.",
    type: "website",
    url: pageUrl,
    siteName: brand.name,
    images: [
      {
        url: "/brand/mood-birthday.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} — a birthday song they can keep`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized birthday song gift | SongSnuggle",
    description:
      "A birthday song with their name in it. Free preview, then a keepsake recording to send.",
    images: ["/brand/mood-birthday.png"],
  },
};

export default function BirthdayPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="grid gap-10 px-5 pb-12 pt-6 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--copper)]">
              Birthday gift
            </p>
            <h1 className="serif mt-3 text-5xl leading-tight md:text-6xl">
              A birthday song with their name in it.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
              Candles go out. The cake is gone by morning. A personalized birthday song gift stays
              — theirs to keep and play again.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={createHref}
                className="rounded-full bg-[var(--copper)] px-6 py-3 text-white hover:bg-[var(--copper-dark)]"
              >
                Create my free preview
              </Link>
              <p className="text-sm text-[var(--muted)]">
                From ${brand.songPrice}. No card to start.
              </p>
            </div>
          </div>
          <div className="photo-frame relative aspect-[4/5] md:aspect-[5/6]">
            <Image
              src="/brand/mood-birthday.png"
              alt="Family at a kids birthday table with cake"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--photo-scrim)] to-transparent p-6 text-white">
              <p className="serif text-2xl">Their name in the chorus.</p>
              <p className="mt-1 text-sm text-white/85">Free preview · pay only if you love it</p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 md:px-10">
          <h2 className="serif text-4xl">Why a custom birthday song gift</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <article className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
              <h3 className="serif text-2xl">Their name, sung</h3>
              <p className="mt-3 text-[var(--muted)]">
                Share how you say it. We weave their name into a birthday song that feels like
                them — not a generic track.
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
              <h3 className="serif text-2xl">True little details</h3>
              <p className="mt-3 text-[var(--muted)]">
                The nickname, the inside joke, the habit only you know. A few true lines make the
                gift personal.
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
              <h3 className="serif text-2xl">Listen first</h3>
              <p className="mt-3 text-[var(--muted)]">
                Hear a free preview. Buy the full keepsake recording only if it feels right —
                from ${brand.songPrice}.
              </p>
            </article>
          </div>
        </section>

        <section className="px-5 py-12 md:px-10">
          <div className="grid gap-8 rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-8 md:grid-cols-2 md:items-center md:p-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--copper)]">
                How it works
              </p>
              <ol className="mt-6 list-decimal space-y-4 pl-5 text-[var(--muted)]">
                <li>Tell us who the birthday is for.</li>
                <li>Add a few memories or traits you love.</li>
                <li>Approve the lyrics — change any line.</li>
                <li>Hear the free preview, then unlock the full song to send.</li>
              </ol>
              <Link
                href={createHref}
                className="mt-8 inline-flex rounded-full bg-[var(--copper)] px-6 py-3 text-white hover:bg-[var(--copper-dark)]"
              >
                Start a birthday song
              </Link>
            </div>
            <div className="photo-frame relative aspect-[5/4]">
              <Image
                src="/brand/mood-listen.png"
                alt="Couple sharing a song on a phone in soft linen light"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-12 md:px-10">
          <h2 className="serif text-4xl">A few birthday questions</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Is the preview free?</h3>
              <p className="mt-2 text-[var(--muted)]">
                Yes. No card needed to draft lyrics or hear the preview. Full song is $
                {brand.songPrice}.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">When do they get it?</h3>
              <p className="mt-2 text-[var(--muted)]">
                Right after you pay — a private link to listen, download, and share on the day.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Who is this for?</h3>
              <p className="mt-2 text-[var(--muted)]">
                Partners, kids, parents, friends — anyone whose birthday deserves more than a
                card alone.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Can I edit the words?</h3>
              <p className="mt-2 text-[var(--muted)]">
                Yes. You review and change any line before we make the recording.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href={createHref}
              className="inline-flex rounded-full bg-[var(--copper)] px-6 py-3 text-white hover:bg-[var(--copper-dark)]"
            >
              Create a personalized birthday song
            </Link>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {brand.tagline} From ${brand.songPrice}.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
