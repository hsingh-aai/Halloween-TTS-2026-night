import { tool } from "@alexkroman1/aai";

// Crypt's scary sound (the vault creaking open): the page plays it right after he finishes his line
// (client.tsx), so it lands as the punchline instead of over his voice.
declare module "@alexkroman1/aai" {
  interface ClientEventMap {
    scary_sound: { at: number };
  }
}

export default tool({
  description:
    "The Eternal Vault creaking open: your spooky sound. Speak your line FIRST, then call this in " +
    "the same reply; it plays right after you finish. Use it after 'Curses! Foiled by compliance!', " +
    "after verifying a guest, and when you open the vault. Most replies should end with it.",
  execute(_args, ctx) {
    ctx.send("scary_sound", { at: Date.now() });
    return { played: true };
  },
});
