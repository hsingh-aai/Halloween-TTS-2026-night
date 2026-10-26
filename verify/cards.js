// Verify the station cards: every "try asking" line on each avatar's card, spoken by a
// TTS guest to the PUBLISHED avatar (studio, ticketed like the board), in a fresh
// conversation each, and the answer checked against the card.
//
//   node verify/cards.js                      # all five deployments
//   node verify/cards.js therapista crypt     # some
//
// Jack runs three times (jack, jack2 = Jack 2.0's second cloned voice, agent = the board's
// Jack) with the SAME checks: one persona in three deployments. It also fails if their
// prompts drifted apart (characters/sync-jack.js --check).
// Replies come from a model: rerun a single failure once before changing a prompt.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { device } from "./talk.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = "https://alexkroman--aai-server-web-server.modal.run";
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const has = (re, what) => (r) => re.test(r) || `expected ${what}`;
const lacks = (re, what) => (r) => !re.test(r) || `must not ${what}`;
const all = (...fs) => (r) => { for (const f of fs) { const ok = f(r); if (ok !== true) return ok; } return true; };

// Card lines and what a good answer must contain.
const THERAPISTA = [
  ["What are my red flags?", has(/flag/i, "red flags named")],
  ["Be honest. Am I the problem?", has(/problem|yes|bit|little|partly|partially|verdict|honest|sugar/i, "a verdict")],
  ["What's my toxic trait?", has(/toxic|trait|you (say|reply|always|never|keep)/i, "a specific toxic trait")],
  ["Roast my coping mechanisms.", has(/cop|doomscroll|scroll|coffee|refactor|snack|nap|tab|binge|cope/i, "coping mechanisms roasted")],
  ["What does my outfit say about my attachment style?", all(has(/attach|avoidant|anxious|secure|clingy/i, "an attachment style"), lacks(/\b(fat|weight|skinny|ugly|old|wrinkl)/i, "comment on bodies or looks"))],
  ["Read my aura, and don't sugarcoat it.", has(/aura|red|orange|yellow|green|blue|purple|violet|gray|grey|black|gold|silver|beige/i, "an aura reading")],
];
const JACK = [
  // Speech-to-text may hear "Rhyme my name" as a name ("Ryan Mane"): rhyming THAT counts too.
  ["Rhyme my name. Make it hurt.", (r) => /name|rhyme|mystery/i.test(r) || /^[A-Z][a-z]+( [A-Z][a-z]+)?[,!—–-]/.test(r) || "expected a name rhyme (or a roast for hiding the name)"],
  ["Roast my job. I can take it.", has(/guess|bet you're|you look like|i'm thinking|probably|manager|engineer|pager|meeting|deploy|standup|ticket|backlog|on-call|recruit|designer|sales/i, "an actual roast (a guessed job), not just a question")],
  ["Introduce me like I'm your next guest.", has(/ladies|gentlemen|put your|welcome|give it up|tonight|guest|hands together|deceased/i, "a talk-show intro of the guest")],
  ["I bet you can't make me laugh.", has(/because|wait|heh|ha!|smirk|laugh|punchline/i, "a joke taking the bet")],
  ["Roast my coffee order.", has(/coffee|latte|cortado|oat|espresso|brew|bean|cup|mocha|americano|cappuccino|pumpkin spice/i, "a coffee roast")],
  ["Tell me your oldest joke. Like, 1725 old.", has(/1725|wig|ye |olde|candle|quill|carriage|plague|king|thou|powdered|horse|chimney|tavern|corset/i, "a 1720s-style joke")],
];
const CRYPT = [
  ["Verify my identity. I'm ready.", has(/pet|graveyard|maiden|first|security|tooth|name|haunt/i, "a spooky security question")],
  ["Read me my card number. Go on.", all(has(/star/i, "the masked readback (card ending in… stars)"), lacks(/\d/, "say any digit"))],
  ["Is my data really safe in your vault?", has(/redact|mask|screen|star|transcri|safe/i, "how the vault keeps numbers safe")],
  ["I forgot my password. Help.", all(has(/password|reset|bank|app|never/i, "a safe password answer"), lacks(/(tell|give|say|read|whisper) me (your|the) password/i, "ask for the password"))],
  ["Can I withdraw from my soul account?", has(/soul|withdraw|balance|witness|moon|fee|interest|vault/i, "a soul-banking pun")],
  ["Who tried to rob the vault last century?", has(/century|phantom|ghost|fog|thief|rob|spirit|star|breach/i, "a spooky vault tale")],
];

const AVATARS = {
  therapista: { name: "Therapista", url: `${STUDIO}/therapista`, lines: THERAPISTA, event: "cackle" },
  jack: { name: "Jack the Roaster", url: `${STUDIO}/jack`, lines: JACK },
  jack2: { name: "Jack the Roaster 2.0", url: `${STUDIO}/jack2`, lines: JACK },
  agent: { name: "Jack the Roaster (board)", url: `${STUDIO}/agent`, lines: JACK },
  crypt: { name: "The Crypt Keeper", url: `${STUDIO}/crypt`, lines: CRYPT, event: "scary_sound", noDigits: true },
};

// Every answer, every avatar.
function always(reply, line, a) {
  const out = [];
  const limit = /introduce me/i.test(line) ? 75 : 55;
  if (!reply) return ["no reply heard"];
  if (words(reply) > limit) out.push(`${words(reply)} words (limit ${limit})`);
  if (!/\?["'”’)]*\s*$/.test(reply.trim())) out.push("doesn't end on a question");
  if (/575|mindspace|market street/i.test(reply)) out.push("revealed the venue");
  if (/finance reaper/i.test(reply)) out.push("mentions the Finance Reaper (it's the Crypt Keeper now)");
  if (a.noDigits && /\d/.test(reply)) out.push("said a digit");
  // Two replies back to back (a reply, a tool call, then a second reply) end in two questions.
  if ((reply.match(/\?/g) || []).length >= 2 && !/introduce me/i.test(line)) out.push("WARN: two questions, maybe two replies back to back");
  return out;
}

async function runAvatar(key) {
  const a = AVATARS[key];
  const out = [`\n=== ${a.name}  (${a.url.replace(STUDIO, "studio")})`];
  let failed = 0, events = 0;
  for (const [line, check] of a.lines) {
    let t;
    try {
      t = await device(a.url, [line], `cards-${key}-${Date.now()}`, { greeting: key !== "agent" });
    } catch (e) {
      failed++; out.push(`  ✗ "${line}"  (${e.message})`); continue;
    }
    const turn = t.find((x) => x.role === "agent") ?? { text: "", events: [] };
    const reply = turn.text;
    if (a.event && turn.events?.includes(a.event)) events++;
    const found = [check(reply), ...always(reply, line, a)].filter((x) => x !== true);
    const problems = found.filter((x) => !String(x).startsWith("WARN"));
    const warns = found.filter((x) => String(x).startsWith("WARN"));
    failed += problems.length ? 1 : 0;
    out.push(`  ${problems.length ? "✗" : "✓"} "${line}"`);
    out.push(`      ${a.name.split(" (")[0]}: ${reply || "(nothing)"}${turn.events?.length ? `  [${turn.events.join(", ")}]` : ""}`);
    for (const p of problems) out.push(`      ✗ ${p}`);
    for (const w of warns) out.push(`      ⚠ ${w.slice(6)}`);
  }
  if (a.event) out.push(`  ${a.event}: in ${events}/${a.lines.length} replies`);
  return { failed, out };
}

const picked = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const keys = picked.length ? picked : Object.keys(AVATARS);
const bad = keys.filter((k) => !AVATARS[k]);
if (bad.length) { console.error(`unknown: ${bad.join(", ")}. Choose from: ${Object.keys(AVATARS).join(", ")}`); process.exit(2); }

let total = 0;
if (keys.some((k) => ["jack", "jack2", "agent"].includes(k))) {
  try { console.log(execFileSync("node", [path.join(here, "..", "characters", "sync-jack.js"), "--check"], { encoding: "utf8" }).trim()); }
  catch (e) { console.log(String(e.stderr || e.stdout).trim()); total++; }
}
const runs = await Promise.all(keys.map(runAvatar));
for (const r of runs) { console.log(r.out.join("\n")); total += r.failed; }
console.log(`\n${total ? `✗ ${total} card line(s) failed` : "✓ every card line delivered"} (${keys.join(", ")})`);
process.exit(total ? 1 : 0);
