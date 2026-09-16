CREATE TABLE IF NOT EXISTS gift_codes (
  code TEXT PRIMARY KEY,
  from_job_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  redeemed_at TEXT,
  redeemed_job_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_gift_codes_from ON gift_codes(from_job_id);
