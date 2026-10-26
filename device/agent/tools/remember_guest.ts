import { tool } from "@alexkroman1/aai";
import { z } from "zod";
import { updateGuest } from "../guests.ts";

export default tool({
  description:
    "Write a guest into your guest book. Call it as soon as you learn a guest's name, " +
    "again when you learn their job, and once after each roast or joke you tell them, " +
    "so you can call it back if they return and never tell them the same joke twice. " +
    "Call it silently: don't announce that you're saving anything.",
  inputSchema: z.object({
    name: z.string().min(1).max(60).describe("The guest's first name, as they said it"),
    job: z.string().max(80).optional().describe("Their job, if they told you"),
    joke: z.string().max(160).optional().describe("A short summary of the joke you just told them"),
    new_visit: z.boolean().optional().describe("True the first time you hear their name in this conversation"),
  }),
  async execute({ name, job, joke, new_visit }) {
    const g = await updateGuest(name, { job, joke, visit: new_visit });
    // Said so the model doesn't speak a SECOND reply after this returns (guests heard Jack
    // answer twice: once before the call, once after it).
    return { saved: g.name, visits: g.visits, note: "Saved silently. If you already spoke your reply this turn, say nothing more." };
  },
});
