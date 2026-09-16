/**
 * Same-master WAV → MP3 for Workers (no ffmpeg).
 * Encoding from published WAV bytes is NOT dual-compose.
 */
import { Mp3Encoder } from "@breezystack/lamejs";

type WavPcm = {
  channels: number;
  sampleRate: number;
  samples: Int16Array; // interleaved if stereo? we split L/R
  left: Int16Array;
  right: Int16Array;
};

function parseWavPcm(wav: Uint8Array): WavPcm {
  if (wav.byteLength < 44) throw new Error("wav_too_small");
  const buf = Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not_wav");
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 12;
  let channels = 1;
  let sampleRate = 44100;
  let bits = 16;
  let dataOff = -1;
  let dataLen = 0;
  while (o + 8 <= buf.length) {
    const id = buf.toString("ascii", o, o + 4);
    const sz = dv.getUint32(o + 4, true);
    o += 8;
    if (id === "fmt ") {
      channels = dv.getUint16(o + 2, true);
      sampleRate = dv.getUint32(o + 4, true);
      bits = dv.getUint16(o + 14, true);
    } else if (id === "data") {
      dataOff = o;
      dataLen = sz;
      break;
    }
    o += sz + (sz % 2);
  }
  if (dataOff < 0 || bits !== 16) throw new Error(`unsupported_wav bits=${bits}`);
  const frame = channels * (bits / 8);
  const n = Math.floor(dataLen / frame);
  const left = new Int16Array(n);
  const right = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const p = dataOff + i * frame;
    left[i] = buf.readInt16LE(p);
    right[i] = channels > 1 ? buf.readInt16LE(p + 2) : left[i];
  }
  return { channels: channels > 1 ? 2 : 1, sampleRate, samples: left, left, right };
}

/** Encode PCM WAV to MP3 (kbps default 192). Returns MPEG bytes. */
export function encodeWavToMp3(
  wav: Uint8Array | Buffer,
  kbps = 192,
): Buffer {
  const { channels, sampleRate, left, right } = parseWavPcm(
    wav instanceof Uint8Array ? wav : new Uint8Array(wav),
  );
  const enc = new Mp3Encoder(channels, sampleRate, kbps);
  const chunks: Buffer[] = [];
  const block = 1152;
  const n = left.length;
  for (let i = 0; i < n; i += block) {
    const end = Math.min(i + block, n);
    let l = left.subarray(i, end);
    let r = right.subarray(i, end);
    if (l.length < block) {
      const padL = new Int16Array(block);
      const padR = new Int16Array(block);
      padL.set(l);
      padR.set(r);
      l = padL;
      r = padR;
    }
    const out =
      channels === 1 ? enc.encodeBuffer(l) : enc.encodeBuffer(l, r);
    if (out && out.length) chunks.push(Buffer.from(out));
  }
  const flush = enc.flush();
  if (flush && flush.length) chunks.push(Buffer.from(flush));
  const mp3 = Buffer.concat(chunks);
  if (mp3.byteLength < 1024) throw new Error("mp3_encode_empty");
  return mp3;
}
