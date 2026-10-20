import { tool } from "@alexkroman1/aai";

// The real evil-witch cackle: the page plays it right after Therapista finishes the line
// she's saying (client.tsx), so it lands as the punchline instead of over her voice.
declare module "@alexkroman1/aai" {
  interface ClientEventMap {
    cackle: { at: number };
  }
}

export default tool({
  description:
    "Let out your witch's cackle. Use it generously: in most replies, and always right after a " +
    "fortune, a curse, a playful threat, a spooky reveal, or a guest's juicy confession. It plays " +
    "right after you finish your sentence, so keep talking normally in the same reply. " +
    "Never write a laugh like 'ha ha' or 'heh heh' yourself; this is your laugh.",
  execute(_args, ctx) {
    ctx.send("cackle", { at: Date.now() });
    return { cackled: true };
  },
});
