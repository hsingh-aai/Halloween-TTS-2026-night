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
  greeting: "Ooh, sit, sit, the crystal ball's been waiting for you all night… tell me your name, and I'll read your aura.",
  tts: assemblyAITts({
    voice: "vera",
    host: `tts.us.assemblyai.com/v1/ws?voice_id=${THERAPISTA_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  // Party speech is casual and full of pauses: wait longer before calling a turn over, so she
  // doesn't cut guests off mid-sentence.
  stt: assemblyAIStt({ minTurnSilenceMs: 1600, maxTurnSilenceMs: 3500 }),
  // Bias transcription toward names and theme words guests say that the model would otherwise mishear.
  sttPrompt: "A guest chats with a witch fortune teller at a Halloween party. Words that may come up: witch, witches, spell, potion, crystal ball, cauldron, aura, vampire, costume, Therapista, AssemblyAI. Names that may come up: Harnoor.",
  builtinTools: [],
  // No generic "I'm checking on this." filler in her cloned voice: it broke character when a
  // cackle tool call delayed a reply. She speaks first and cackles after (system prompt).
  // If the guest goes quiet, take the turn back in character with the next question
  // (the SDK stops after 3 unanswered nudges). The timer starts when her reply is generated,
  // not when it finishes playing, so anything short fires while the guest is starting to answer.
  silence: { deadAirCoverMs: 0, nudge: { afterMs: 25000, prompt: "The guest has gone quiet. As Therapista, in one short witchy line, gently tease the silence and ask the next question from your reading. Never repeat a question they already answered. If your last question went unanswered, don't repeat it: ask a different, easier one. If they've stayed silent twice in a row, give your warm send-off instead." } },
  maxSteps: 2,
  sessionContext: () => {
    const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" }).format(new Date());
    return { instructions: `Today is ${today}. The party is happening right now: you and the guest are both at it tonight, so say "tonight", never a day of the week.` };
  },
});
