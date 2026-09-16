import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cloudflareBindings } from "./cloudflare";

const dataDir = path.join(process.cwd(), "data");
const giftCodesPath = path.join(dataDir, "gift-codes.json");

const UNREDEEMED_SOFT_CAP = 20;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type GiftCodeRow = {
  code: string;
  fromJobId: string;
  createdAt: string;
  redeemedAt: string | null;
  redeemedJobId: string | null;
};

export type RedeemResult =
  | { ok: true; code: string }
  | { ok: false; reason: "not_found" | "already_used" };

let writeChain: Promise<void> = Promise.resolve();

function enqueue(work: () => Promise<void>) {
  writeChain = writeChain.then(work, work);
  return writeChain;
}

export function normalizeGiftCode(code: unknown): string {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

function randomSuffix(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

function makeCode(): string {
  return `LOVE${randomSuffix(6)}`;
}

const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS gift_codes (
  code TEXT PRIMARY KEY,
  from_job_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  redeemed_at TEXT,
  redeemed_job_id TEXT
)`;
const INDEX_SQL =
  "CREATE INDEX IF NOT EXISTS idx_gift_codes_from ON gift_codes(from_job_id)";

let schemaReady: Promise<void> | null = null;

async function ensureSchema(db: D1Database) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.prepare(SCHEMA_SQL).run();
      await db.prepare(INDEX_SQL).run();
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

async function readLocal(): Promise<GiftCodeRow[]> {
  try {
    const raw = await readFile(giftCodesPath, "utf8");
    return JSON.parse(raw) as GiftCodeRow[];
  } catch {
    return [];
  }
}

async function writeLocal(rows: GiftCodeRow[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(giftCodesPath, JSON.stringify(rows, null, 2));
}

/**
 * Mint a one-time free-song gift code tied to a paid from_job.
 * Soft-caps ~20 unredeemed codes per from_job.
 */
export async function mintGiftCode(fromJobId: string): Promise<{ code: string }> {
  const from = String(fromJobId || "").trim();
  if (!from) throw new Error("from_job_id required");

  const env = await cloudflareBindings();
  if (env?.DB) {
    await ensureSchema(env.DB);
    const countRow = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM gift_codes WHERE from_job_id = ? AND redeemed_at IS NULL",
    )
      .bind(from)
      .first<{ n: number }>();
    const unredeemed = Number(countRow?.n ?? 0);
    if (unredeemed >= UNREDEEMED_SOFT_CAP) {
      throw new Error("Too many unredeemed gifts from this song — wait for a friend to redeem one.");
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeCode();
      const createdAt = new Date().toISOString();
      try {
        await env.DB.prepare(
          "INSERT INTO gift_codes (code, from_job_id, created_at, redeemed_at, redeemed_job_id) VALUES (?, ?, ?, NULL, NULL)",
        )
          .bind(code, from, createdAt)
          .run();
        return { code };
      } catch {
        /* collision — retry */
      }
    }
    throw new Error("Could not mint a unique gift code");
  }

  let minted = "";
  await enqueue(async () => {
    const rows = await readLocal();
    const unredeemed = rows.filter((r) => r.fromJobId === from && !r.redeemedAt).length;
    if (unredeemed >= UNREDEEMED_SOFT_CAP) {
      throw new Error("Too many unredeemed gifts from this song — wait for a friend to redeem one.");
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeCode();
      if (rows.some((r) => r.code === code)) continue;
      rows.push({
        code,
        fromJobId: from,
        createdAt: new Date().toISOString(),
        redeemedAt: null,
        redeemedJobId: null,
      });
      await writeLocal(rows);
      minted = code;
      return;
    }
    throw new Error("Could not mint a unique gift code");
  });
  if (!minted) throw new Error("Could not mint a unique gift code");
  return { code: minted };
}

/**
 * Atomically redeem a one-time gift code for a job.
 */
export async function redeemGiftCode(
  codeInput: string,
  redeemedJobId: string,
): Promise<RedeemResult> {
  const code = normalizeGiftCode(codeInput);
  const jobId = String(redeemedJobId || "").trim();
  if (!code || !jobId) return { ok: false, reason: "not_found" };

  const env = await cloudflareBindings();
  if (env?.DB) {
    await ensureSchema(env.DB);
    const existing = await env.DB.prepare(
      "SELECT code, redeemed_at FROM gift_codes WHERE code = ?",
    )
      .bind(code)
      .first<{ code: string; redeemed_at: string | null }>();
    if (!existing) return { ok: false, reason: "not_found" };
    if (existing.redeemed_at) return { ok: false, reason: "already_used" };

    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      "UPDATE gift_codes SET redeemed_at = ?, redeemed_job_id = ? WHERE code = ? AND redeemed_at IS NULL",
    )
      .bind(now, jobId, code)
      .run();
    const changes = Number(
      (result as { meta?: { changes?: number } })?.meta?.changes ?? 0,
    );
    if (changes < 1) return { ok: false, reason: "already_used" };
    return { ok: true, code };
  }

  let outcome: RedeemResult = { ok: false, reason: "not_found" };
  await enqueue(async () => {
    const rows = await readLocal();
    const idx = rows.findIndex((r) => r.code === code);
    if (idx < 0) {
      outcome = { ok: false, reason: "not_found" };
      return;
    }
    if (rows[idx]!.redeemedAt) {
      outcome = { ok: false, reason: "already_used" };
      return;
    }
    rows[idx] = {
      ...rows[idx]!,
      redeemedAt: new Date().toISOString(),
      redeemedJobId: jobId,
    };
    await writeLocal(rows);
    outcome = { ok: true, code };
  });
  return outcome;
}
