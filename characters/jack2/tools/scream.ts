import { tool } from "@alexkroman1/aai";

// Jack's pumpkin scream: the page plays it right after he finishes his line (client.tsx), so
// it lands as the rimshot instead of over his voice.
declare module "@alexkroman1/aai" {
  interface ClientEventMap {
    scream: { at: number };
  }
}

export default tool({
  description:
    "Your pumpkin scream, your rimshot. Speak your line FIRST, then call this in the same reply; " +
    "it plays right after you finish. Use it right after your best punchline, a savage rhyme, or " +
    "a roast that lands, about every other reply.",
  execute(_args, ctx) {
    ctx.send("scream", { at: Date.now() });
    return { screamed: true };
  },
});
