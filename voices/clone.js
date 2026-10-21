// Clone a voice on AssemblyAI TTS and make it speakable:
//   1. POST /v1/voices (form upload of the clip)   2. pair it with the dated model
//   3. wait for the pairing to be "ready"            4. say a test line with voice_id
//
// Only clone a voice you have the speaker's permission to clone.
//
//   node voices/clone.js <clip.mp3|wav> "<voice name>" ["test line"] --consent   -> prints the voice_id
//
// --consent is you attesting (the API's required consent_attested field) that the person
// whose voice is in the clip agreed to it being cloned. Without it the script refuses.
//   node voices/clone.js --list
//   node voices/clone.js --delete <voice_id>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = process.env.AAI_TTS_SERVER ?? "https://tts.us.assemblyai.com";
const key = process.env.ASSEMBLY_AI_KEY ??
  fs.readFileSync(path.join(here, "..", ".env"), "utf8").match(/^ASSEMBLY_AI_KEY=(.+)$/m)[1].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, body, headers = {}) {
  const res = await fetch(SERVER + p, { method, body, headers: { Authorization: key, ...headers } });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json;
}

async function datedModel() {
  const { models } = await api("GET", "/v1/models");
  const m = models.find((x) => (x.aliases ?? []).includes("latest")) ?? models[0];
  return m.id ?? m.name;
}

async function clone(file, name) {
  const form = new FormData();
  const type = file.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
  form.append("file", new Blob([fs.readFileSync(file)], { type }), path.basename(file));
  form.append("name", name);
  form.append("language", "english");
  form.append("consent_attested", "true");
  const voice = await api("POST", "/v1/voices", form, { "Idempotency-Key": crypto.randomUUID() });
  return voice;
}

async function pair(id, model) {
  try {
    await api("POST", `/v1/voices/${id}/pairings`, JSON.stringify({ model }), { "Content-Type": "application/json" });
  } catch (e) {
    if (!/409|already/i.test(e.message)) throw e;
  }
  for (let i = 0; i < 90; i++) {
    const p = await api("GET", `/v1/voices/${id}/pairings/${model}`);
    const status = p.status ?? p.state;
    if (status === "ready") return p;
    if (/fail|error/i.test(status ?? "")) throw new Error(`pairing ${status}: ${JSON.stringify(p)}`);
    if (i % 5 === 0) console.log(`  pairing: ${status}…`);
    await sleep(2000);
  }
  throw new Error("pairing not ready after 3 minutes");
}

// Speak a line with the cloned voice over the WebSocket and save a wav.
async function say(voiceId, text, out) {
  const ws = new WebSocket(`wss://${new URL(SERVER).host}/v1/ws?voice_id=${voiceId}&model_id=assemblyai-tts-1&sample_rate=24000&language=english`, { headers: { Authorization: key } });
  const pcm = [];
  await new Promise((resolve, reject) => {
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === "Begin") { ws.send(JSON.stringify({ type: "Generate", text })); ws.send(JSON.stringify({ type: "Flush" })); }
      else if (m.type === "Audio") pcm.push(Buffer.from(m.audio, "base64"));
      else if (m.type === "FlushDone") ws.send(JSON.stringify({ type: "Terminate" }));
      else if (m.type === "Error") reject(new Error(`${m.error_code}: ${m.error}`));
    });
    ws.addEventListener("close", resolve);
  });
  const b = Buffer.concat(pcm), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + b.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(b.length, 40);
  fs.writeFileSync(out, Buffer.concat([h, b]));
  return Math.round(b.length / 48);
}

const consent = process.argv.includes("--consent");
const [a, b, c] = process.argv.slice(2).filter((x) => x !== "--consent");
if (a === "--list") {
  console.log(JSON.stringify(await api("GET", "/v1/voices"), null, 2));
} else if (a === "--delete") {
  await api("DELETE", `/v1/voices/${b}`);
  console.log("deleted", b);
} else if (a && b && !consent) {
  console.error("Refusing to clone without --consent: only clone a voice whose owner agreed to it.");
  process.exit(2);
} else if (a && b) {
  const model = await datedModel();
  console.log(`cloning ${path.basename(a)} as "${b}" for ${model}`);
  const v = await clone(a, b);
  const id = v.id ?? v.voice_id;
  console.log(`  voice_id ${id}`);
  await pair(id, model);
  console.log("  pairing ready");
  const out = path.join(here, "..", "out", `clone-${b.toLowerCase().replace(/\W+/g, "-")}.wav`);
  const ms = await say(id, c ?? "Oh honey, sit, sit. The crystal ball's been buzzing about you all night.", out);
  console.log(`  test line: ${ms} ms -> ${path.relative(process.cwd(), out)}`);
  console.log(`voice_id=${id}`);
} else {
  console.log('usage: node voices/clone.js <clip> "<name>" ["test line"] --consent | --list | --delete <voice_id>');
}
