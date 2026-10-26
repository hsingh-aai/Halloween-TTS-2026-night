import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";

// Crypt, Keeper of the Eternal Vault: the finance station's "voice you'd trust with your
// most sensitive information", in a CLONED voice (voices/voices.json). The page (client.tsx)
// is the vault screen: every number a guest says is redacted on it as it's spoken, and his
// scary stinger (tools/scary_sound.ts) plays after his line.
//
// The SDK's TTS stage only takes stock voice names, so the clone rides in `host`: the SDK
// builds wss://<host>/v1/ws/?voice=…, and the server ignores everything after our `&_`.
const CRYPT_VOICE_ID = process.env.CRYPT_VOICE_ID ?? "01a15fa1-0214-7617-ac85-611182c5925f";

export default agent({
  name: "The Crypt Keeper",
  description: "The Crypt Keeper, Keeper of the Eternal Vault: trustworthy voice, live redaction (Text-to-Screech)",
  greeting: "Welcome… to the Eternal Vault. Come in, don't be afraid. First, I must verify your identity… what was the name of your first haunted pet?",
  tts: assemblyAITts({
    voice: "george",
    host: `tts.us.assemblyai.com/v1/ws?voice_id=${CRYPT_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  stt: assemblyAIStt({ minTurnSilenceMs: 700, maxTurnSilenceMs: 2400 }),
  // Bias transcription toward names guests say that the model would otherwise mishear.
  sttPrompt: "Names that may come up: Harnoor.",
  builtinTools: [],
  maxSteps: 2,
  // No generic "I'm checking on this." filler in his cloned voice.
  // If the guest goes quiet, take the turn back in character with the next question
  // (the SDK stops after 3 unanswered nudges).
  silence: { deadAirCoverMs: 0, nudge: { afterMs: 8000, prompt: "The guest has gone silent. As Crypt, in one slow, grave line, remark on the silence of the vault and ask the next specific question of the visit. Never repeat a question they already answered. If your last question went unanswered, don't repeat it: ask a different, easier one. If they've stayed silent twice in a row, give your warm send-off instead." } },
  sessionContext: () => {
    const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }).format(new Date());
    return { instructions: `Today is ${today}. The party is Thursday, October 29, 2026.` };
  },
});
