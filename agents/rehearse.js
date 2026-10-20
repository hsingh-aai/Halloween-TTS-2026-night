// Rehearse a station without a microphone: a simulated guest (spoken by our own TTS)
// talks to the real agent in real time. Prints the conversation and saves it as a wav.
//   node rehearse.js witch|reaper|jack
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { speak, wavHeader, SAMPLE_RATE as SR } from "../speak.js";
import { loadKey } from "./create-agents.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const GUEST = {
  witch: ["Hi! I'm Priya.", "I'm a backend engineer, and honestly I'm drowning in on-call alerts.", "Ha, okay, that's way too accurate. Thank you!"],
  reaper: ["Hey, I'm Marcus.", "Sure, I'd love to save some money.", "Okay, it's four two four two, four two four two, four two four two, four two four two.", "Ha! Goodbye, Reaper."],
  jack: ["My name is Dana.", "I'm a product manager.", "Wait, that was actually funny. Bye Jack!"],
};

// Optional custom guest lines: node rehearse.js jack "I'm Sam." "I sell insurance."
const slug = process.argv[2] ?? "witch";
if (process.argv.length > 3) GUEST[slug] = process.argv.slice(3);
const agentId = JSON.parse(fs.readFileSync(path.join(here, "agents.json"), "utf8"))[slug]?.id;
if (!agentId) throw new Error(`no agent for ${slug}; run create-agents.js`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = await Promise.all(GUEST[slug].map((t) => speak(t, "jean")));

const url = new URL("https://agents.assemblyai.com/v1/token");
url.searchParams.set("expires_in_seconds", "60");
url.searchParams.set("max_session_duration_seconds", "300");
const { token } = await (await fetch(url, { headers: { Authorization: loadKey() } })).json();
const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);

const recording = [];        // interleaved conversation audio
let replyDone = null;
const events = {};
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  events[m.type] = (events[m.type] ?? 0) + 1;
  if (m.type === "reply.audio") recording.push(Buffer.from(m.data, "base64"));
  if (m.type === "transcript.user") console.log(`  guest: ${m.text}`);
  if (m.type === "transcript.agent") console.log(`  ${slug}: ${m.text}${m.interrupted ? " [interrupted]" : ""}`);
  if (m.type === "transcript.agent.delta" && events[m.type] === 1) console.log("  (first agent delta shape:", JSON.stringify(m).slice(0, 160), ")");
  if (m.type === "reply.done" && m.status !== "interrupted") replyDone?.(); // a barge-in isn't the end of the turn
  if (m.type === "session.error") console.error("  session.error", m);
});
const waitReply = () => new Promise((r) => { replyDone = r; setTimeout(r, 20000); });

await new Promise((r) => ws.addEventListener("open", r));
ws.send(JSON.stringify({ type: "session.update", session: { agent_id: agentId } }));
await new Promise((r) => ws.addEventListener("message", (ev) => JSON.parse(ev.data).type === "session.ready" && r()));
console.log(`${slug} (${agentId}) ready`);
await waitReply(); // greeting

const CHUNK = SR / 20 * 2; // 50 ms of PCM16
const silence = Buffer.alloc(SR * 2 * 2); // 2 s
for (const pcm of lines) {
  await sleep(600); // let the greeting/reply audio "finish playing"
  recording.push(pcm);
  const audio = Buffer.concat([pcm, silence]);
  const done = waitReply();
  for (let i = 0; i < audio.length; i += CHUNK) {
    ws.send(JSON.stringify({ type: "input.audio", audio: audio.subarray(i, i + CHUNK).toString("base64") }));
    await sleep(50);
  }
  await done;
}
await sleep(2500); // let any trailing reply finish
ws.send(JSON.stringify({ type: "session.end" }));
await sleep(800);
ws.close();

const pcm = Buffer.concat(recording);
const out = path.join(here, "..", "out", `rehearsal-${slug}.wav`);
fs.writeFileSync(out, Buffer.concat([wavHeader(pcm.length), pcm]));
console.log("events:", JSON.stringify(events));
console.log("saved", path.relative(process.cwd(), out));
