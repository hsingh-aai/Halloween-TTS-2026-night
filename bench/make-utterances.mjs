// Renders the benchmark's guest questions with AssemblyAI TTS (voice aai-jean) to
// bench/utterances/NN.pcm (PCM16 mono 24 kHz) + utterances.json.
//   node bench/make-utterances.mjs [set]   -> a named set (SETS below) goes to bench/utterances-<set>/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const key = fs.readFileSync(path.join(here, "..", ".env"), "utf8").match(/^ASSEMBLY_AI_KEY=(.+)$/m)[1].trim();
// A guest walking through a station card, in order, so the character's tools run as at the party.
const SETS = {
  jack: [
    "Hi Jack, I'm Harnoor.",
    "I'm a solutions engineer.",
    "Roast my coffee order. It's an oat milk latte.",
    "I bet you can't make me laugh.",
    "I'm dressing up as a vampire.",
    "Tell me your oldest joke. Like, 1725 old.",
  ],
};
const set = process.argv[2];
const LINES = set ? SETS[set] : [
  "What's a good Halloween costume for a software engineer?",
  "Tell me a quick fun fact about pumpkins.",
  "What candy should I hand out this year?",
  "Give me a spooky movie to watch tonight.",
  "How do I carve a pumpkin without making a mess?",
  "What's the best way to throw a small Halloween party?",
  "Suggest a name for a black cat.",
  "What's a fun Halloween snack I can make in ten minutes?",
];
async function tts(text) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://tts.us.assemblyai.com/v1/ws?voice_id=aai-jean&model_id=assemblyai-tts-1&sample_rate=24000&language=english", { headers: { Authorization: key } });
    const parts = [];
    ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
      if (m.type === "Begin") { ws.send(JSON.stringify({ type: "Generate", text })); ws.send(JSON.stringify({ type: "Flush" })); }
      else if (m.type === "Audio") parts.push(Buffer.from(m.audio, "base64"));
      else if (m.type === "FlushDone") ws.send(JSON.stringify({ type: "Terminate" }));
      else if (m.type === "Error") reject(new Error(m.error)); });
    ws.addEventListener("close", () => resolve(Buffer.concat(parts)));
  });
}
const out = path.join(here, set ? `utterances-${set}` : "utterances");
fs.mkdirSync(out, { recursive: true });
const meta = [];
for (const [i, text] of LINES.entries()) {
  let pcm = await tts(text);
  // trim trailing silence so "end of speech" is the real end of the words
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1);
  let end = s.length; while (end > 0 && Math.abs(s[end - 1]) < 300) end--;
  pcm = Buffer.from(s.slice(0, end + 240).buffer);
  const f = `${String(i).padStart(2, "0")}.pcm`;
  fs.writeFileSync(path.join(out, f), pcm);
  meta.push({ file: f, text, seconds: +(pcm.length / 48000).toFixed(2) });
}
fs.writeFileSync(path.join(out, "utterances.json"), JSON.stringify(meta, null, 2));
console.log(meta.map((m) => `${m.file} ${m.seconds}s  ${m.text}`).join("\n"));
