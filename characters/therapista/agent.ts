import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";

// Therapista, the witch-therapist, speaking in her CLONED voice (voices/voices.json).
// The SDK's TTS stage only takes stock voice names, so the clone rides in `host`: the SDK
// builds wss://<host>/v1/ws/?voice=…, and everything after our `&_` is ignored by the
// server, which then speaks voice_id (it answers Begin with voice "custom").
const THERAPISTA_VOICE_ID = process.env.THERAPISTA_VOICE_ID ?? "01a15b4b-77b1-739f-bb06-fec5f22d43df";

export default agent({
  name: "Therapista",
  description: "Witch-therapist with a crystal ball, Text-to-Screech Halloween happy hour",
  // Silent start for the board: its chime says "I'm listening", and a greeting played while
  // the mic is muted would swallow the guest's first words (same as Jack).
  greeting: "",
  tts: assemblyAITts({
    voice: "vera",
    host: `tts.use1.assemblyai.com/v1/ws?voice_id=${THERAPISTA_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  stt: assemblyAIStt({ minTurnSilenceMs: 650, maxTurnSilenceMs: 2200 }),
  builtinTools: [],
  maxSteps: 2,
  sessionContext: () => {
    const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }).format(new Date());
    return { instructions: `Today is ${today}. The party is Thursday, October 29, 2026.` };
  },
});
