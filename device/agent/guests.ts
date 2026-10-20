import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// Jack's guest book: one JSON file on the machine running the agent (`aai dev`).
// Small on purpose: a party is a few hundred people, and the whole book (most recent
// first, capped) goes into every session's prompt so Jack never has to guess to look.

export type Guest = { name: string; job?: string; jokes: string[]; visits: number; lastSeen: string };

const FILE = path.join(process.env.JACK_DATA_DIR ?? path.join(process.cwd(), "data"), "guests.json");
const MAX_IN_PROMPT = 60;

export async function readGuests(): Promise<Record<string, Guest>> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

// Serialized: the model may call remember_guest twice in one step.
let queue: Promise<unknown> = Promise.resolve();
export function updateGuest(name: string, patch: { job?: string; joke?: string; visit?: boolean }) {
  const run = queue.then(async () => {
    const book = await readGuests();
    const key = name.trim().toLowerCase();
    const g = book[key] ?? { name: name.trim(), jokes: [], visits: 0, lastSeen: "" };
    if (patch.job) g.job = patch.job.trim();
    if (patch.joke && !g.jokes.includes(patch.joke.trim())) g.jokes = [...g.jokes, patch.joke.trim()].slice(-8);
    if (patch.visit) g.visits += 1;
    g.lastSeen = new Date().toISOString();
    book[key] = g;
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(`${FILE}.tmp`, JSON.stringify(book, null, 2));
    await rename(`${FILE}.tmp`, FILE);
    return g;
  });
  queue = run.catch(() => {});
  return run;
}

// Today's date in San Francisco and how far off the party is, so Jack can count down.
const EVENT_DAY = "2026-10-29";
export function eventCountdown(now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now); // YYYY-MM-DD
  const pretty = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }).format(now);
  const days = Math.round((Date.parse(EVENT_DAY) - Date.parse(today)) / 86_400_000);
  const when =
    days > 1 ? `The party is in ${days} days.` :
    days === 1 ? "The party is tomorrow!" :
    days === 0 ? "The party is TONIGHT: you're at it right now." :
    "The party already happened; you're still haunting the place.";
  return `Today is ${pretty}. ${when}`;
}

export async function guestBookContext() {
  const guests = Object.values(await readGuests())
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, MAX_IN_PROMPT);
  const date = eventCountdown();
  if (!guests.length) return { instructions: `${date}\nYour guest book is empty: everyone is new to you.` };
  const lines = guests.map((g) => {
    const job = g.job ? `, ${g.job}` : "";
    const jokes = g.jokes.length ? `; jokes you already told them: ${g.jokes.join(" | ")}` : "";
    return `- ${g.name}${job} (visits: ${g.visits})${jokes}`;
  });
  return { instructions: `${date}\nYour guest book, most recent first:\n${lines.join("\n")}` };
}
