// Create (or update) the three station agents on AssemblyAI and save their ids to agents.json.
// Re-run any time personas.js changes: existing agents (matched by name) are updated in place.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS } from "./personas.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const API = "https://agents.assemblyai.com/v1/agents";
const OUT = path.join(here, "agents.json");

export function loadKey() {
  if (process.env.ASSEMBLY_AI_KEY) return process.env.ASSEMBLY_AI_KEY;
  const env = fs.readFileSync(path.join(here, "..", ".env"), "utf8");
  const m = env.match(/^ASSEMBLY_AI_KEY=(.+)$/m);
  if (!m) throw new Error("ASSEMBLY_AI_KEY missing from .env");
  return m[1].trim();
}

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: loadKey(), "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// The API stores the voice in two places and defaults output.voice to something else, so set both.
const toBody = ({ name, system_prompt, greeting, voice, input }) =>
  ({ name, system_prompt, greeting, voice, input, output: { voice: voice.voice_id } });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const saved = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  for (const p of PERSONAS) {
    const id = saved[p.slug]?.id;
    const agent = id ? await call("PUT", `${API}/${id}`, toBody(p)) : await call("POST", API, toBody(p));
    saved[p.slug] = { id: agent.id ?? id, name: p.name };
    console.log(`${id ? "updated" : "created"} ${p.name}: ${saved[p.slug].id}`);
  }
  fs.writeFileSync(OUT, JSON.stringify(saved, null, 2) + "\n");
}
