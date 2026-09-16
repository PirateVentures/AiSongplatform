import { NextResponse } from "next/server";
import { mintGiftCode } from "@/lib/gift-codes";
import { getJob } from "@/lib/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }
  if (!job.paidAt && !job.fullReady) {
    return NextResponse.json(
      { error: "Unlock your song first — then you can gift one to a friend." },
      { status: 403 },
    );
  }

  try {
    const { code } = await mintGiftCode(job.id);
    const invitePath = `/create?from=gift&utm_source=song_gift&utm_medium=share_friend&promo=${encodeURIComponent(code)}`;
    console.info(
      JSON.stringify({
        level: "info",
        event: "gift_code_minted",
        fromJobId: job.id,
        codePrefix: code.slice(0, 6),
      }),
    );
    return NextResponse.json({ code, invitePath });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not mint gift code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
