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
  // Open with a question so the guest never has to start the reading.
  greeting: "Ooh, sit, sit, the crystal ball's been waiting for you all night… what's your name, sugar?",
  tts: assemblyAITts({
    voice: "vera",
    host: `tts.us.assemblyai.com/v1/ws?voice_id=${THERAPISTA_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  stt: assemblyAIStt({ minTurnSilenceMs: 650, maxTurnSilenceMs: 2200 }),
  // Bias transcription toward names guests say that the model would otherwise mishear.
  sttPrompt: "Names that may come up: Harnoor.",
  builtinTools: [],
  // No generic "I'm checking on this." filler in her cloned voice: it broke character when a
  // cackle tool call delayed a reply. She speaks first and cackles after (system prompt).
  // If the guest goes quiet, take the turn back in character with the next question
  // (the SDK stops after 3 unanswered nudges).
  silence: { deadAirCoverMs: 0, nudge: { afterMs: 8000, prompt: "The guest has gone quiet. As Therapista, in one short witchy line, tease the silence (the spirits noticed) and ask them the next specific question from your reading. Never repeat a question they already answered. If your last question went unanswered, don't repeat it: ask a different, easier one. If they've stayed silent twice in a row, give your warm send-off instead." } },
  maxSteps: 2,
  sessionContext: () => {
    const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }).format(new Date());
    return { instructions: `Today is ${today}. The party is Thursday, October 29, 2026.` };
  },
});
