// Talk to a character the way a guest would: each guest line is spoken by our TTS and
// streamed in real time, and we collect what the character says back (as text).
//   station(agentId, lines)  -> AssemblyAI Voice Agent API (the three kiosk stations)
//   device(url, lines)       -> an aai agent over the aai-device protocol (Jack on the board)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { speak, SAMPLE_RATE as TTS_RATE } from "../speak.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GUEST_VOICE = "jean";

function key() {
  if (process.env.ASSEMBLY_AI_KEY) return process.env.ASSEMBLY_AI_KEY;
  const m = fs.readFileSync(path.join(here, "..", ".env"), "utf8").match(/^ASSEMBLY_AI_KEY=(.+)$/m);
  if (!m) throw new Error("ASSEMBLY_AI_KEY missing from .env");
  return m[1].trim();
}

// PCM16 mono resample (linear), for a device agent that wants 16 kHz mic audio.
function resample(pcm, from, to) {
  if (from === to) return pcm;
  const src = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1);
  const out = new Int16Array(Math.floor((src.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const x = (i * from) / to, j = Math.floor(x), f = x - j;
    out[i] = (src[j] ?? 0) * (1 - f) + (src[j + 1] ?? src[j] ?? 0) * f;
  }
  return Buffer.from(out.buffer);
}

async function stream(send, pcm, rate) {
  const chunk = (rate / 50) * 2; // 20 ms
  const audio = Buffer.concat([pcm, Buffer.alloc(rate * 2 * 2)]); // + 2 s of silence ends the turn
  for (let i = 0; i < audio.length; i += chunk) {
    send(audio.subarray(i, i + chunk));
    await sleep(20);
  }
}

// One turn = everything the character says after a guest line, until it goes quiet.
function collector() {
  let replies = [], waiter = null, timer = null;
  return {
    push(text) {
      replies.push(text);
      clearTimeout(timer);
      timer = setTimeout(() => waiter?.(), 2500); // a short follow-up sentence still counts
    },
    async next(timeoutMs = 25000) {
      await new Promise((r) => { waiter = r; setTimeout(r, timeoutMs); });
      const turn = replies.join(" ").trim();
      replies = [];
      return turn;
    },
  };
}

export async function station(agentId, lines) {
  const audio = await Promise.all(lines.map((t) => speak(t, GUEST_VOICE)));
  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "60");
  url.searchParams.set("max_session_duration_seconds", "300");
  const { token } = await (await fetch(url, { headers: { Authorization: key() } })).json();
  const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);
  const c = collector();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === "transcript.agent" && m.text) c.push(m.text);
  });
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  ws.send(JSON.stringify({ type: "session.update", session: { agent_id: agentId } }));
  const transcript = [{ role: "agent", text: await c.next() }]; // greeting
  for (let i = 0; i < lines.length; i++) {
    transcript.push({ role: "guest", text: lines[i] });
    await stream((b) => ws.send(JSON.stringify({ type: "input.audio", audio: b.toString("base64") })), audio[i], TTS_RATE);
    transcript.push({ role: "agent", text: await c.next() });
  }
  ws.send(JSON.stringify({ type: "session.end" }));
  await sleep(300);
  ws.close();
  return transcript;
}

// A studio-published agent (an https:// agent URL) admits a session only with a ticket:
// GET <agent>/client-config returns the sandbox's sessionUrl and a short-lived sessionToken.
// A local `aai dev` (ws://) needs none.
async function sessionSocketUrl(baseUrl, client) {
  if (!/^https?:/.test(baseUrl)) return `${baseUrl}?resume=1&client=${client}`;
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/client-config`);
  if (!res.ok) throw new Error(`client-config ${res.status}`);
  const { sessionUrl, sessionToken } = await res.json();
  if (!sessionUrl || !sessionToken) throw new Error("client-config returned no sessionUrl/sessionToken");
  return `${sessionUrl}?resume=1&client=${client}&token=${encodeURIComponent(sessionToken)}`;
}

export async function device(baseUrl, lines, client = "verify") {
  const audio = await Promise.all(lines.map((t) => speak(t, GUEST_VOICE)));
  const ws = new WebSocket(await sessionSocketUrl(baseUrl, client)); // resume=1: no spoken greeting, like the board
  ws.binaryType = "arraybuffer";
  const c = collector();
  let micRate = 16000;
  const configured = new Promise((r) => {
    ws.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return; // TTS audio: not needed for text checks
      const m = JSON.parse(ev.data);
      if (m.type === "session.configured") {
        micRate = m.sampleRate ?? micRate;
        ws.send(JSON.stringify({ type: "audio_ready" }));
        r();
      }
      if ((m.type === "agentTranscript.committed" || m.type === "agent-transcript.committed") && m.text) c.push(m.text);
    });
  });
  const refused = new Promise((_, j) => {
    ws.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return;
      const m = JSON.parse(ev.data);
      if (m.type === "error.reported" && m.fatal) j(new Error(`agent refused the session: ${m.message}`));
    });
    ws.addEventListener("close", (e) => j(new Error(`socket closed before the session was configured (${e.code})`)));
  });
  refused.catch(() => {});
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", () => j(new Error("could not open the session socket"))); });
  await Promise.race([configured, refused]);
  const transcript = [];
  for (let i = 0; i < lines.length; i++) {
    transcript.push({ role: "guest", text: lines[i] });
    await stream((b) => ws.send(b), resample(audio[i], TTS_RATE, micRate), micRate);
    transcript.push({ role: "agent", text: await c.next() });
  }
  ws.close();
  await sleep(300);
  return transcript;
}
