/**
 * SongSnuggle Worker entry: audio Range fast-path BEFORE OpenNext.
 *
 * OpenNext turns NextResponse bodies into streams and Cloudflare then drops
 * Content-Length on GET — Safari/iOS <audio> stalls mid-play (5–12s).
 * Serving MP3 from KV here with a fixed-length Uint8Array body keeps
 * Content-Length + Accept-Ranges + 206 honest for /preview and /song.
 */
import openNext from "../.open-next/worker.js";

export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "../.open-next/worker.js";

const PREVIEW_MAX_SECONDS = 45;

function parseRange(header, size) {
  if (!header || !header.startsWith("bytes=") || size <= 0) return null;
  const spec = header.slice(6).trim();
  const [startRaw, endRaw] = spec.split("-", 2);
  let start;
  let end;
  if (startRaw === "") {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === undefined || endRaw === "" ? size - 1 : Number(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < 0 || start >= size) return null;
    end = Math.min(end, size - 1);
    if (end < start) return null;
  }
  return { start, end };
}

function audioKey(jobId, kind, format) {
  return format === "mp3" ? `audio:${jobId}:${kind}:mp3` : `audio:${jobId}:${kind}`;
}

function fixedBody(bytes) {
  // Contiguous ArrayBuffer-backed view so workerd sets Content-Length.
  const copy = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return copy.byteOffset === 0 && copy.byteLength === copy.buffer.byteLength
    ? copy
    : copy.slice();
}

function buildAudioResponse(bytes, contentType, request, extra = {}) {
  const body = fixedBody(bytes);
  const size = body.byteLength;
  const base = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    "X-Audio-Fastpath": "1",
    ...extra,
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader && !parseRange(rangeHeader, size)) {
    return new Response(null, {
      status: 416,
      headers: {
        ...base,
        "Content-Range": `bytes */${size}`,
        "Content-Length": "0",
      },
    });
  }

  const range = parseRange(rangeHeader, size);
  const isHead = request.method === "HEAD";

  if (!range) {
    return new Response(isHead ? null : body, {
      status: 200,
      headers: {
        ...base,
        "Content-Length": String(size),
      },
    });
  }

  const { start, end } = range;
  const chunk = body.subarray(start, end + 1);
  const out = fixedBody(chunk);
  return new Response(isHead ? null : out, {
    status: 206,
    headers: {
      ...base,
      "Content-Length": String(out.byteLength),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}

function skipId3(bytes) {
  if (bytes.byteLength >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    return 10 + size;
  }
  return 0;
}

function findMpegFrame(bytes, from = 0) {
  for (let i = from; i + 4 < bytes.byteLength; i += 1) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) return i;
  }
  return -1;
}

function readMp3DurationSeconds(bytes) {
  const start = skipId3(bytes);
  const frame = findMpegFrame(bytes, start);
  if (frame < 0) return null;
  const versionBits = (bytes[frame + 1] >> 3) & 0x03;
  const layerBits = (bytes[frame + 1] >> 1) & 0x03;
  if (layerBits !== 1) return null;
  const srTable = [
    [11025, 12000, 8000],
    [0, 0, 0],
    [22050, 24000, 16000],
    [44100, 48000, 32000],
  ];
  const srIndex = (bytes[frame + 2] >> 2) & 0x03;
  const sampleRate = srTable[versionBits]?.[srIndex] || 0;
  if (!sampleRate) return null;
  const samplesPerFrame = versionBits === 3 ? 1152 : 576;
  const channelMode = (bytes[frame + 3] >> 6) & 0x03;
  const mono = channelMode === 3;
  const side = versionBits === 3 ? (mono ? 17 : 32) : mono ? 9 : 17;
  const xingAt = frame + 4 + side;
  if (xingAt + 12 >= bytes.byteLength) return null;
  const tag = String.fromCharCode(
    bytes[xingAt],
    bytes[xingAt + 1],
    bytes[xingAt + 2],
    bytes[xingAt + 3],
  );
  if (tag !== "Xing" && tag !== "Info") return null;
  const flags =
    (bytes[xingAt + 4] << 24) |
    (bytes[xingAt + 5] << 16) |
    (bytes[xingAt + 6] << 8) |
    bytes[xingAt + 7];
  if ((flags & 0x0001) === 0) return null;
  const frames =
    (bytes[xingAt + 8] << 24) |
    (bytes[xingAt + 9] << 16) |
    (bytes[xingAt + 10] << 8) |
    bytes[xingAt + 11];
  if (!frames) return null;
  return (frames * samplesPerFrame) / sampleRate;
}

function rewriteXingForTruncatedPreview(bytes, originalDuration, maxSeconds) {
  const start = skipId3(bytes);
  const frame = findMpegFrame(bytes, start);
  if (frame < 0) return bytes;
  const versionBits = (bytes[frame + 1] >> 3) & 0x03;
  const layerBits = (bytes[frame + 1] >> 1) & 0x03;
  if (layerBits !== 1) return bytes;
  const channelMode = (bytes[frame + 3] >> 6) & 0x03;
  const mono = channelMode === 3;
  const side = versionBits === 3 ? (mono ? 17 : 32) : mono ? 9 : 17;
  const xingAt = frame + 4 + side;
  if (xingAt + 12 >= bytes.byteLength) return bytes;
  const tag = String.fromCharCode(
    bytes[xingAt],
    bytes[xingAt + 1],
    bytes[xingAt + 2],
    bytes[xingAt + 3],
  );
  if (tag !== "Xing" && tag !== "Info") return bytes;
  const flags =
    (bytes[xingAt + 4] << 24) |
    (bytes[xingAt + 5] << 16) |
    (bytes[xingAt + 6] << 8) |
    bytes[xingAt + 7];
  const out = new Uint8Array(bytes);
  const ratio =
    originalDuration && originalDuration > 0
      ? Math.min(1, maxSeconds / originalDuration)
      : bytes.byteLength / Math.max(bytes.byteLength, 1);
  let cursor = xingAt + 8;
  if (flags & 0x0001) {
    const oldFrames =
      (out[cursor] << 24) | (out[cursor + 1] << 16) | (out[cursor + 2] << 8) | out[cursor + 3];
    const newFrames = Math.max(1, Math.floor(oldFrames * ratio));
    out[cursor] = (newFrames >>> 24) & 0xff;
    out[cursor + 1] = (newFrames >>> 16) & 0xff;
    out[cursor + 2] = (newFrames >>> 8) & 0xff;
    out[cursor + 3] = newFrames & 0xff;
    cursor += 4;
  }
  if (flags & 0x0002) {
    const newBytes = out.byteLength;
    out[cursor] = (newBytes >>> 24) & 0xff;
    out[cursor + 1] = (newBytes >>> 16) & 0xff;
    out[cursor + 2] = (newBytes >>> 8) & 0xff;
    out[cursor + 3] = newBytes & 0xff;
  }
  return out;
}

/** Hard-cap unpaid preview MP3 to maxSeconds; rewrite Xing so scrubber matches body. */
function hardCapPreviewMp3(bytes, maxSeconds) {
  if (!bytes || maxSeconds <= 0 || bytes.byteLength < 4096) return bytes;
  const duration = readMp3DurationSeconds(bytes);
  let cut = null;
  if (duration && duration > maxSeconds + 0.5) {
    const keep = Math.floor(bytes.byteLength * (maxSeconds / duration));
    cut = bytes.subarray(0, Math.max(keep, 4096));
  } else if (duration && duration <= maxSeconds + 0.5) {
    return bytes;
  } else {
    const maxBytes = Math.floor((180_000 * maxSeconds) / 8) + 65_536;
    if (bytes.byteLength <= maxBytes) return bytes;
    cut = bytes.subarray(0, maxBytes);
  }
  return rewriteXingForTruncatedPreview(cut, duration, maxSeconds);
}

async function tryServeAudio(request, env) {
  if (!env?.AUDIO || !env?.DB) return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})\/audio\/?$/i);
  if (!match) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const id = match[1];
  const row = await env.DB.prepare("SELECT json FROM jobs WHERE id = ?")
    .bind(id)
    .first();
  if (!row?.json) {
    return new Response(JSON.stringify({ error: "Song not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
    });
  }

  let job;
  try {
    job = typeof row.json === "string" ? JSON.parse(row.json) : row.json;
  } catch {
    return new Response(JSON.stringify({ error: "Song not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
    });
  }

  const wantFull = url.searchParams.get("full") === "1";
  if (wantFull && !job.paidAt) {
    return new Response(JSON.stringify({ error: "Full song unlocks after payment." }), {
      status: 402,
      headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
    });
  }

  // Joseph ONE-master / dual-asset P0: paid+fullReady → default serves FULL
  // (same master as ?full=1). Never leave stale preview as default after promote.
  const kind =
    job.paidAt && job.fullReady
      ? "full"
      : wantFull && job.fullReady
        ? "full"
        : "preview";
  if (kind === "preview" && !job.previewReady) {
    return new Response(JSON.stringify({ error: "Preview is not ready yet." }), {
      status: 409,
      headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
    });
  }

  const download = url.searchParams.get("download") === "1";
  const formatParam = (url.searchParams.get("format") || "").toLowerCase();
  const wantWav = formatParam === "wav";
  // Elon P0: ?format=mp3 must NEVER return WAV.
  const wantMp3Explicit = formatParam === "mp3";

  let bytes = null;
  let contentType = "audio/mpeg";
  let ext = "mp3";

  if (!wantWav) {
    const mp3 = await env.AUDIO.get(audioKey(id, kind, "mp3"), {
      type: "arrayBuffer",
    });
    if (mp3 && mp3.byteLength > 0) {
      bytes = new Uint8Array(mp3);
      contentType = "audio/mpeg";
      ext = "mp3";
    }
  }

  if ((!bytes || bytes.byteLength === 0) && wantMp3Explicit) {
    return new Response(
      JSON.stringify({
        error: "MP3 not available for this song (format=mp3 never returns WAV).",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
      },
    );
  }

  if (!bytes || bytes.byteLength === 0) {
    const wav = await env.AUDIO.get(audioKey(id, kind, "wav"), {
      type: "arrayBuffer",
    });
    if (wav && wav.byteLength > 0) {
      bytes = new Uint8Array(wav);
      contentType = "audio/wav";
      ext = "wav";
    }
  }

  if (!bytes || bytes.byteLength === 0) {
    return new Response(JSON.stringify({ error: "Audio file missing." }), {
      status: 404,
      headers: { "Content-Type": "application/json", "X-Audio-Fastpath": "1" },
    });
  }

  // Unpaid preview ONLY: hard 45s clock (Xing-honest). Paid full never enters kind===preview.
  if (kind === "preview") {
    if (contentType.includes("mpeg") || contentType.includes("mp3")) {
      bytes = hardCapPreviewMp3(bytes, PREVIEW_MAX_SECONDS);
    }
  }

  const filename = `${(job.recipientName || "songsnuggle")}-${kind}.${ext}`.replace(
    /[^\w.-]+/g,
    "-",
  );

  return buildAudioResponse(bytes, contentType, request, {
    ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const audio = await tryServeAudio(request, env);
      if (audio) return audio;
    } catch (err) {
      console.error("[audio-fastpath]", err);
    }
    return openNext.fetch(request, env, ctx);
  },
};
