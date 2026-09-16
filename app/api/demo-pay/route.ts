import { NextResponse } from "next/server";
import { normalizeGiftCode, redeemGiftCode } from "@/lib/gift-codes";
import { fulfillPaidJob } from "@/lib/fulfill";
import { getJob, publicJob } from "@/lib/store";
import { demoCheckoutEnabled } from "@/lib/whop";
import { matchesFreeSnuggle } from "@/lib/whop-unlock";

export async function POST(request: Request) {
  const body = (await request.json()) as { jobId?: string; promoCode?: string };
  const promo = normalizeGiftCode(body.promoCode);
  const freeSnuggle = matchesFreeSnuggle(promo);
  const jobId = String(body.jobId || "");

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }
  if (!job.previewReady || !job.listenCompletedAt) {
    return NextResponse.json(
      { error: "Listen to the preview before unlocking the song." },
      { status: 400 },
    );
  }

  // Internal forever ops unlock
  if (freeSnuggle) {
    const next = await fulfillPaidJob(job, "freesnuggle");
    console.info(
      JSON.stringify({
        level: "info",
        event: "promo_or_demo_unlock",
        jobId: next.id,
        path: "freesnuggle",
      }),
    );
    return NextResponse.json({ job: publicJob(next), path: "freesnuggle" });
  }

  // One-time friend gift codes
  if (promo) {
    const redeemed = await redeemGiftCode(promo, job.id);
    if (!redeemed.ok) {
      if (redeemed.reason === "already_used") {
        return NextResponse.json(
          { error: "That gift was already used" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Gift code not found" }, { status: 400 });
    }
    const next = await fulfillPaidJob(job, "giftshare");
    console.info(
      JSON.stringify({
        level: "info",
        event: "promo_or_demo_unlock",
        jobId: next.id,
        path: "giftshare",
        codePrefix: promo.slice(0, 6),
      }),
    );
    return NextResponse.json({ job: publicJob(next), path: "giftshare" });
  }

  if (!demoCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Demo checkout is off. Use Whop pay, or enter a gift / promo code." },
      { status: 403 },
    );
  }

  const next = await fulfillPaidJob(job, "demo");
  console.info(
    JSON.stringify({
      level: "info",
      event: "promo_or_demo_unlock",
      jobId: next.id,
      path: "demo",
    }),
  );
  return NextResponse.json({ job: publicJob(next), path: "demo" });
}
