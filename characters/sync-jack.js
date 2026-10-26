// One Jack, three deployments: the studio "jack" and "jack2" (Jack 2.0, a second cloned
// voice) and the board's "agent" (device/agent). They must say and do the same things, so
// characters/jack is the source of truth for everything but agent.ts (voice, greeting,
// board-only audio settings):
//   node characters/sync-jack.js           copy it over
//   node characters/sync-jack.js --check   exit 1 if any copy has drifted (verify runs this)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(root, "jack");
const COPIES = [path.join(root, "jack2"), path.join(root, "..", "device", "agent")];
const FILES = ["system-prompt.md", "guests.ts", "tools/remember_guest.ts", "tools/recall_guest.ts"];

const check = process.argv.includes("--check");
let drift = 0;
for (const dir of COPIES) {
  for (const f of FILES) {
    const want = fs.readFileSync(path.join(SOURCE, f), "utf8");
    const p = path.join(dir, f);
    const have = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    if (have === want) continue;
    drift++;
    const rel = path.relative(path.join(root, ".."), p);
    if (check) console.error(`drift: ${rel} differs from characters/jack/${f}`);
    else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, want); console.log(`synced ${rel}`); }
  }
}
if (check) { console.log(drift ? `✗ ${drift} Jack file(s) drifted` : "✓ all three Jacks share one prompt, tools and guest book"); process.exit(drift ? 1 : 0); }
if (!drift) console.log("already in sync");
