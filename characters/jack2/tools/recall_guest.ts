import { tool } from "@alexkroman1/aai";
import { z } from "zod";
import { readGuests } from "../guests.ts";

export default tool({
  description:
    "Look a guest up in your guest book by name, for someone not in the list you were " +
    "given at the start (they may have visited since), or when a guest asks what you remember about them.",
  inputSchema: z.object({ name: z.string().min(1).max(60) }),
  async execute({ name }) {
    const g = (await readGuests())[name.trim().toLowerCase()];
    return g ?? { note: `No ${name} in the guest book yet: they're new.` };
  },
});
