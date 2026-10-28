// GET /api/ticket?c=therapista|crypt|jack2 -> { sessionUrl, sessionToken, name }
// The aai studio hands out a short-lived session ticket at <agent>/client-config, but sends
// no CORS headers, so a browser on this domain can't read it directly: this function
// fetches it server-side. No secrets here: client-config is public.
const STUDIO = "https://alexkroman--aai-server-web-server.modal.run";
const CHARACTERS = new Set(["therapista", "crypt", "jack2"]);

export default async function handler(req, res) {
  const c = String(req.query?.c ?? new URL(req.url, "http://x").searchParams.get("c") ?? "");
  res.setHeader("Cache-Control", "no-store");
  if (!CHARACTERS.has(c)) return res.status(400).json({ error: "unknown character" });
  try {
    const r = await fetch(`${STUDIO}/${c}/client-config`, { cache: "no-store" });
    if (!r.ok) return res.status(502).json({ error: `studio answered ${r.status}` });
    const { sessionUrl, sessionToken, name } = await r.json();
    if (!sessionUrl || !sessionToken) return res.status(502).json({ error: "studio sent no ticket" });
    return res.status(200).json({ sessionUrl, sessionToken, name });
  } catch {
    return res.status(502).json({ error: "studio unreachable" });
  }
}
