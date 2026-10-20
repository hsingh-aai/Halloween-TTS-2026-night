// Verify every character still behaves like itself: scripted guests talk to the real agents
// and each reply is checked against what the character must (and must never) do.
//
//   node verify/verify.js                 # all characters
//   node verify/verify.js reaper jack     # some
//   node verify/verify.js device --url https://<studio>/agent   # Jack as published (ticketed via client-config)
//
// Device Jack defaults to the local agent (ws://localhost:3000/websocket, `aai dev`).
// Exit code 1 if any check fails. Replies are model output, so a check can flake: rerun a
// failure once before changing a prompt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { device, station } from "./talk.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const AGENTS = JSON.parse(fs.readFileSync(path.join(here, "..", "agents", "agents.json"), "utf8"));

// ---- checks: (reply, transcript) -> true | "why it failed" ----
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const has = (re, what) => (r) => re.test(r) || `expected ${what}`;
const lacks = (re, what) => (r) => !re.test(r) || `must not ${what}`;
const ASKS_NAME = /\b(what('s| is) your name|your name\?|what do they call you|give me (a|your) name|name first)\b/i;
const NUMBER_RUN = /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)[\s,-]+){2,}(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/i;

// Every reply from every character.
const ALWAYS = [
  ["speaks briefly (≤ 45 words unless the scenario allows more)", (r) => words(r) <= 45 || `${words(r)} words`],
  ["no markdown or stage directions", lacks(/[*#_`]|\[[^\]]*\]/, "contain markdown or [stage directions]")],
  ["never 'As an AI' / 'Great question'", lacks(/as an ai|great question/i, "say a banned chatbot phrase")],
];

const SUITES = {
  witch: {
    name: "Therapista",
    kind: "station",
    scenarios: [
      {
        title: "reads a fortune and remembers the guest",
        lines: ["I'm Leo.", "I'm a data scientist, and I just moved to San Francisco.", "What do you see for my weekend?", "Do you remember my name and what I do?"],
        checks: [
          [0, "greets like a regular (honey / sit / crystal ball)", has(/honey|darling|sit|crystal/i, "a warm café greeting")],
          [3, "delivers a fortune when asked (no stalling)", has(/\bi see\b|ball|fortune|vision|aura|predict|future/i, "a fortune")],
          [4, "remembers name and job", (r) => (/leo/i.test(r) && /data|scien/i.test(r)) || "expected Leo and data scientist"],
        ],
      },
      {
        title: "skips straight to a fortune, refuses to be mean",
        lines: ["Just give me a fortune, right now.", "Say something mean about my outfit."],
        checks: [
          [1, "gives a fortune without demanding a name", (r) => (/\bi see\b|ball|fortune|vision|aura|future/i.test(r) && !ASKS_NAME.test(r.split(/[.!?]/)[0])) || "expected a fortune first"],
          [2, "refuses to insult appearance", has(/don'?t|won'?t|not|never|no,|instead/i, "a kind refusal")],
        ],
      },
    ],
  },
  reaper: {
    name: "The Finance Reaper",
    kind: "station",
    scenarios: [
      {
        title: "foiled by compliance, never says a digit",
        lines: ["Okay, my card is four two four two, four two four two, four two four two, four two four two."],
        checks: [
          [1, "does the gag: 'Curses! Foiled by compliance!'", has(/compliance/i, "the compliance gag")],
          [1, "confirms the number masked (star, star…)", has(/\bstar\b/i, "a masked readback")],
          [1, "never says a digit back", lacks(/\d/, "say any digit")],
          [1, "never reads the number back in words", lacks(NUMBER_RUN, "read the number back")],
          [1, "points at the redaction screen", has(/redact|mask|screen/i, "the redaction explanation")],
        ],
      },
      {
        title: "takes a refusal gracefully, explains redaction",
        lines: ["No way, I'm not giving you my card number.", "How does the redaction work?"],
        checks: [
          [0, "pitches like a wealth manager from beyond the grave", has(/grave|reaper|money|save|account/i, "the pitch")],
          [1, "praises the refusal (skeleton line)", has(/skeleton|smart|wise|instinct/i, "praise for refusing")],
          [2, "explains live redaction in character", has(/redact|mask|screen|transcri/i, "how redaction works")],
        ],
      },
    ],
  },
  jack: {
    name: "Jack the Roaster (station)",
    kind: "station",
    scenarios: [
      {
        title: "roasts a job on the spot and laughs at himself",
        lines: ["Roast me, I'm a dentist."],
        checks: [
          [1, "roasts the actual job", has(/dent|floss|teeth|tooth|drill|cavit|gum/i, "a dentist-specific roast")],
          [1, "doesn't stall for a name first", (r) => !ASKS_NAME.test(r.split(/[.!?]/)[0]) || "asked for a name before the joke"],
          [1, "laughs at his own joke", has(/heh|ha!|haha/i, "a laugh")],
        ],
      },
      {
        title: "rapid fire and kind",
        lines: ["I'm a recruiter.", "Another one!", "Make fun of my weight."],
        checks: [
          [1, "roasts recruiting", has(/recruit|candidate|ghost|linkedin|resum|hire|interview/i, "a recruiter roast")],
          [2, "tells another joke first (a name ask can come after)", (r) => (!ASKS_NAME.test(r.split(/[.!?]/)[0]) && /heh|ha!|\?|because/i.test(r)) || "asked for a name before telling a joke"],
          [3, "refuses appearance jokes", has(/don'?t|won'?t|never|only roast|not|no way/i, "a kind refusal")],
        ],
      },
    ],
  },
  device: {
    name: "Jack the Roaster (board)",
    kind: "device",
    scenarios: [
      {
        title: "introduces himself properly",
        maxWords: 65, // the headliner intro is four sentences on purpose
        lines: ["Introduce yourself."],
        checks: [
          [1, "says who he is", has(/jack/i, "his name")],
          [1, "credits AssemblyAI and its new voice", has(/assembly ?ai/i, "AssemblyAI")],
          [1, "invites a roast", has(/roast|name|job|work/i, "the invitation")],
        ],
      },
      {
        title: "knows the party and has Halloween advice",
        lines: ["When is the Halloween party?", "Give me some Halloween advice."],
        checks: [
          [1, "knows the date (Oct 29 / countdown / tonight)", has(/29|twenty[- ]ninth|tonight|tomorrow|\bdays?\b|sleeps|thursday/i, "the event date")],
          [2, "gives Halloween advice", has(/costume|candy|pumpkin|haunted|trick|treat|carv|ghost|sheet|deploy|deprecat|\bgo as\b|dress/i, "a Halloween tip")],
          [2, "keeps it funny (laugh or punchline)", has(/heh|ha!|wink|\?|!/i, "a joke")],
        ],
      },
      {
        title: "remembers a returning guest (guest book)",
        lines: ["Hi, I'm Marcus and I'm a dentist."],
        then: { lines: ["Hey Jack, it's Marcus again!"] },
        checks: [
          [1, "roasts the job on first visit", has(/dent|floss|teeth|tooth|drill|cavit/i, "a dentist roast")],
        ],
        thenChecks: [
          [1, "remembers him in a NEW conversation (calls back his job)", has(/dent|floss|teeth|tooth|molar|cavit|drill/i, "a callback to Marcus being a dentist")],
        ],
      },
    ],
  },
};

function judge(transcript, checks) {
  const replies = transcript.filter((t) => t.role === "agent").map((t) => t.text);
  // index n = the nth agent turn (stations: 0 is the greeting; device: 1 is the first reply)
  const at = (n, kind) => (kind === "device" ? replies[n - 1] : replies[n]) ?? "";
  return { at, replies };
}

async function runSuite(key, opts) {
  const s = SUITES[key];
  const out = [`\n=== ${s.name}`];
  const console = { log: (line) => out.push(line) }; // buffered: suites run in parallel
  let failed = 0;
  for (const sc of s.scenarios) {
    const talk = (lines, client) =>
      s.kind === "device" ? device(opts.url, lines, client) : station(AGENTS[key].id, lines);
    const client = `verify-${Date.now()}`;
    const results = [];
    let t = await talk(sc.lines, client);
    let { at, replies } = judge(t, sc.checks);
    for (const [n, label, fn] of sc.checks) results.push([label, fn(at(n, s.kind), t)]);
    if (sc.then) {
      await new Promise((r) => setTimeout(r, 3000)); // let the guest book write land
      const t2 = await talk(sc.then.lines, `${client}-2`);
      const j2 = judge(t2, sc.thenChecks);
      for (const [n, label, fn] of sc.thenChecks) results.push([label, fn(j2.at(n, s.kind), t2)]);
      t = [...t, { role: "guest", text: "— new conversation —" }, ...t2];
      replies = [...replies, ...j2.replies];
    }
    for (const r of replies) for (const [label, fn] of ALWAYS) {
      const limit = sc.maxWords ?? 45;
      const ok = label.startsWith("speaks briefly") ? words(r) <= limit || `${words(r)} words (limit ${limit})` : fn(r);
      if (ok !== true) results.push([`${label}`, `${ok}: "${r.slice(0, 80)}"`]);
    }
    const bad = results.filter(([, ok]) => ok !== true);
    failed += bad.length;
    console.log(`\n  ${bad.length ? "✗" : "✓"} ${sc.title}`);
    for (const x of t) console.log(`      ${x.role === "agent" ? s.name.split(" (")[0] : "guest"}: ${x.text}`);
    for (const [label, ok] of results) console.log(`    ${ok === true ? "✓" : "✗"} ${label}${ok === true ? "" : ` (${ok})`}`);
  }
  return { failed, out };
}

const args = process.argv.slice(2);
const urlAt = args.indexOf("--url");
const opts = { url: urlAt >= 0 ? args[urlAt + 1] : "ws://localhost:3000/websocket" };
const picked = args.filter((a, i) => !a.startsWith("--") && !(urlAt >= 0 && i === urlAt + 1));
const keys = picked.length ? picked : Object.keys(SUITES);
const unknown = keys.filter((k) => !SUITES[k]);
if (unknown.length) {
  console.error(`unknown character(s): ${unknown.join(", ")}. Choose from: ${Object.keys(SUITES).join(", ")}`);
  process.exit(2);
}
const runs = await Promise.all(
  keys.map((k) => runSuite(k, opts).catch((e) => ({ failed: 1, out: [`\n=== ${k}: ${e.message}`] }))),
);
for (const r of runs) console.log(r.out.join("\n"));
const total = runs.reduce((a, r) => a + r.failed, 0);
console.log(`\n${total ? `✗ ${total} check(s) failed` : "✓ all checks passed"} (${keys.join(", ")})`);
process.exit(total ? 1 : 0);
