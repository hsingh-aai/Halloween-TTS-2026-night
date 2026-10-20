// Station server: serves the kiosk page and mints single-use Voice Agent tokens.
// The API key never reaches the browser.
//   node server.js            -> http://localhost:4400  (pick a station, or /#witch /#reaper /#jack)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS } from "./personas.js";
import { loadKey } from "./create-agents.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4400;

function stations() {
  const ids = fs.existsSync(path.join(here, "agents.json"))
    ? JSON.parse(fs.readFileSync(path.join(here, "agents.json"), "utf8")) : {};
  return PERSONAS.map(({ slug, name, station, pillar, greeting }) => ({
    slug, name, station, pillar, greeting, agent_id: ids[slug]?.id ?? null,
  }));
}

async function token() {
  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120");
  url.searchParams.set("max_session_duration_seconds", "600"); // hard cap per guest
  const res = await fetch(url, { headers: { Authorization: loadKey() } });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).token;
}

const send = (res, code, type, body) => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body); };

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (pathname === "/api/token") return send(res, 200, "application/json", JSON.stringify({ token: await token() }));
    if (pathname === "/api/stations") return send(res, 200, "application/json", JSON.stringify(stations()));
    if (pathname === "/" || pathname === "/index.html")
      return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(path.join(here, "station.html")));
    send(res, 404, "text/plain", "not found");
  } catch (e) {
    console.error(e);
    send(res, 500, "application/json", JSON.stringify({ error: String(e.message || e) }));
  }
}).listen(PORT, () => console.log(`Text-to-Screech stations on http://localhost:${PORT}`));
