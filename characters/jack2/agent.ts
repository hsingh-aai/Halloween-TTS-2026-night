import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";
import { guestBookContext } from "./guests.ts";

// Jack the Roaster: the site's Jack, in the second cloned voice (voices/voices.json), with a
// pumpkin scream after his best lines (tools/scream.ts, client.tsx).
//
// The SDK's TTS stage only takes stock voice names, so the clone rides in `host`: the SDK
// builds wss://<host>/v1/ws/?voice=…, and the server ignores everything after our `&_`.
const JACK_VOICE_ID = process.env.JACK2_VOICE_ID ?? "01a17a78-a590-7e42-9811-1d3d73e833d2";

export default agent({
  name: "Jack the Roaster",
  description: "Jack the Roaster, pumpkin-headed stand-up at the Text-to-Screech Halloween happy hour",
  greeting: "Well, well, well, what have we here? I'm Jack the Roaster. Tell me your name, and I'll rhyme it… and make it hurt.",
  tts: assemblyAITts({
    voice: "george",
    host: `tts.us.assemblyai.com/v1/ws?voice_id=${JACK_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  stt: assemblyAIStt({ minTurnSilenceMs: 700, maxTurnSilenceMs: 2400 }),
  // Bias transcription toward names guests say that the model would otherwise mishear.
  sttPrompt: "Names that may come up: Harnoor. Guests often say: rhyme my name, roast my job, roast my coffee order, introduce me like I'm your next guest, I bet you can't make me laugh.",
  builtinTools: [],
  // remember_guest, then the line, then the scream.
  maxSteps: 4,
  // No generic "I'm checking on this." filler in his cloned voice.
  // If the guest goes quiet, take the turn back in character with the next question
  // (the SDK stops after 3 unanswered nudges).
  silence: { deadAirCoverMs: 0, nudge: { afterMs: 8000, prompt: "The guest has gone quiet. As Jack, roast the silence in one quick line, then ask them the next specific question from your set. Never repeat a question they already answered. If your last question went unanswered, don't repeat it: ask a different, easier one. If they've stayed silent twice in a row, give your warm send-off instead." } },
  sessionContext: () => guestBookContext(),
});
