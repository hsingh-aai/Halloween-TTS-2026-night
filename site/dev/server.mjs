// Local preview of the Vercel site: static files + /api/ticket, on PORT (default 4500).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/ticket.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html; charset=utf-8", ".mp3": "audio/mpeg", ".js": "text/javascript" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ticket") {
    const shim = { setHeader: (k, v) => res.setHeader(k, v), status(code) { res.statusCode = code; return this; }, json(o) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); } };
    return handler({ query: Object.fromEntries(url.searchParams), url: req.url }, shim);
  }
  const file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("not found"); }
  res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT) || 4500, () => console.log("voice lab on http://localhost:" + (Number(process.env.PORT) || 4500)));
