// aai side of the latency benchmark: streams each guest utterance in real time like a
// microphone (then keeps streaming silence) into the local `aai dev` agent, and times
// end-of-speech -> first agent audio.
//   node bench/aai-client.mjs <round> [ws://localhost:3101/websocket] [label] [set]  -> appends to bench/results.jsonl
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [rnd = "1", url = "ws://localhost:3101/websocket", label = "aai", set] = process.argv.slice(2);
const UTT = path.join(here, set ? `utterances-${set}` : "utterances");
const meta = JSON.parse(fs.readFileSync(path.join(UTT, "utterances.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();

function to16k(pcm24) {
  const s = new Int16Array(pcm24.buffer, pcm24.byteOffset, pcm24.length >> 1);
  const o = new Int16Array(Math.floor((s.length * 2) / 3));
  for (let i = 0; i < o.length; i++) {
    const x = i * 1.5, j = Math.floor(x), f = x - j;
    o[i] = (s[j] ?? 0) * (1 - f) + (s[j + 1] ?? s[j] ?? 0) * f;
  }
  return Buffer.from(o.buffer);
}

const ws = new WebSocket(`${url}?client=bench-${rnd}-${Date.now()}`);
ws.binaryType = "arraybuffer";
let micRate = 16000, ttsRate = 24000;
let firstAudioAt = null, audioBytes = 0, waitingSince = null, playsUntil = 0, lastAudioAt = 0;
ws.addEventListener("message", (ev) => {
  if (typeof ev.data !== "string") {
    const t = now();
    if (waitingSince !== null && firstAudioAt === null) firstAudioAt = t;
    if (firstAudioAt !== null) audioBytes += ev.data.byteLength;
    // where a speaker playing it in real time would finish: replies stream in faster than that
    playsUntil = Math.max(playsUntil, t) + (ev.data.byteLength / 2 / ttsRate) * 1000;
    lastAudioAt = t;
    return;
  }
  const m = JSON.parse(ev.data);
  if (m.type === "session.configured") {
    micRate = m.sampleRate ?? micRate;
    ttsRate = m.ttsSampleRate ?? ttsRate;
    ws.send(JSON.stringify({ type: "audio_ready" }));
  }
});
await new Promise((r) => ws.addEventListener("open", r));

// a live mic: 20 ms frames, always flowing (speech when queued, silence otherwise)
const frameBytes = (micRate / 50) * 2;
let queue = [];
let speechDone = null;
const mic = setInterval(() => {
  const f = queue.shift();
  ws.send(f ?? Buffer.alloc(frameBytes));
  if (f && queue.length === 0 && speechDone) { speechDone(now()); speechDone = null; }
}, 20);

await sleep(3000);
// Speak only once the last reply (and any second part after a tool call) has finished playing.
const quiet = async () => { while (now() < Math.max(playsUntil + 1000, lastAudioAt + 2500)) await sleep(50); };
for (const [i, u] of meta.entries()) {
  await quiet();
  const pcm = to16k(fs.readFileSync(path.join(UTT, u.file)));
  firstAudioAt = null; audioBytes = 0; waitingSince = null;
  const ended = new Promise((r) => { speechDone = r; });
  for (let o = 0; o < pcm.length; o += frameBytes) {
    const f = Buffer.alloc(frameBytes);
    pcm.copy(f, 0, o, Math.min(o + frameBytes, pcm.length));
    queue.push(f);
  }
  const tEnd = await ended;
  waitingSince = tEnd;
  const deadline = tEnd + 20000;
  while (firstAudioAt === null && now() < deadline) await sleep(5);
  const latency = firstAudioAt === null ? null : firstAudioAt - tEnd;
  const row = { framework: label, round: Number(rnd), utt: i, latency_ms: latency === null ? null : Math.round(latency * 10) / 10 };
  console.log(row);
  fs.appendFileSync(path.join(here, "results.jsonl"), JSON.stringify(row) + "\n");
}
clearInterval(mic);
ws.close();
