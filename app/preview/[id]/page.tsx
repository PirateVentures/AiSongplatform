import type { Metadata } from "next";
import { PreviewStudio } from "@/components/PreviewStudio";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { brand } from "@/lib/brand";
import { writtenDisplayName } from "@/lib/display-name";
import { getJob } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  const written = job ? writtenDisplayName(job) : "";
  const title = written
    ? `Preview for ${written} · ${brand.name}`
    : `Preview · ${brand.name}`;
  const description = written
    ? `Free ${45}-second preview of a personalized song for ${written}.`
    : `Free preview of a personalized SongSnuggle gift.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <SiteHeader />
      <main className="px-5 py-8 md:px-10">
        <PreviewStudio id={id} />
      </main>
      <SiteFooter />
    </div>
  );
}
