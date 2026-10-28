// GET /api/sound?n=cackle-1|cackle-2|scary|scream -> audio/mpeg
// The sound effects already ship inside the characters' studio pages (inlined as data URIs,
// see characters/*/cackles.ts and sounds.ts); this serves them from there, so the site holds
// no audio files of its own and always plays what the studio characters use.
const STUDIO = "https://alexkroman--aai-server-web-server.modal.run";
const SOUNDS = { "cackle-1": ["therapista", 0], "cackle-2": ["therapista", 1], scary: ["crypt", 0], scream: ["jack2", 0] };
const cache = new Map();

async function soundsOf(character) {
  if (cache.has(character)) return cache.get(character);
  const html = await (await fetch(`${STUDIO}/${character}/`)).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], `${STUDIO}/${character}/`).href);
  const found = [];
  for (const src of scripts) {
    const js = await (await fetch(src)).text();
    for (const m of js.matchAll(/data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)/g)) found.push(m[1]);
  }
  if (found.length) cache.set(character, found);
  return found;
}

export default async function handler(req, res) {
  const n = String(req.query?.n ?? new URL(req.url, "http://x").searchParams.get("n") ?? "");
  const spec = SOUNDS[n];
  if (!spec) return res.status(400).json({ error: "unknown sound" });
  try {
    const b64 = (await soundsOf(spec[0]))[spec[1]];
    if (!b64) return res.status(502).json({ error: "sound not found in the studio page" });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return res.status(200).send(Buffer.from(b64, "base64"));
  } catch {
    return res.status(502).json({ error: "studio unreachable" });
  }
}
