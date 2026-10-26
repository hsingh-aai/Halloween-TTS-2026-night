import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";
import { guestBookContext } from "./guests.ts";

// Jack the Roaster 2.0: Jack's persona in a second cloned voice (voices/voices.json), a test station.
//
// The SDK's TTS stage only takes stock voice names, so the clone rides in `host`: the SDK
// builds wss://<host>/v1/ws/?voice=…, and the server ignores everything after our `&_`.
const JACK_VOICE_ID = process.env.JACK2_VOICE_ID ?? "01a17a78-a590-7e42-9811-1d3d73e833d2";

export default agent({
  name: "Jack the Roaster 2.0",
  description: "Jack the Roaster in a second cloned voice, test station for the Text-to-Screech Halloween happy hour",
  greeting: "Well, well, well, what have we here? I'm Jack, version two point oh, and I've got a fresh rhyme ready… what's your name?",
  tts: assemblyAITts({
    voice: "george",
    host: `tts.us.assemblyai.com/v1/ws?voice_id=${JACK_VOICE_ID}&model_id=assemblyai-tts-1&language=english&_`,
  }),
  stt: assemblyAIStt({ minTurnSilenceMs: 700, maxTurnSilenceMs: 2400 }),
  // Bias transcription toward names guests say that the model would otherwise mishear.
  sttPrompt: "Names that may come up: Harnoor.",
  builtinTools: [],
  maxSteps: 3,
  // No generic "I'm checking on this." filler in his cloned voice.
  // If the guest goes quiet, take the turn back in character with the next question
  // (the SDK stops after 3 unanswered nudges).
  silence: { deadAirCoverMs: 0, nudge: { afterMs: 8000, prompt: "The guest has gone quiet. As Jack, roast the silence in one quick line, then ask them the next specific question from your set. Never repeat a question they already answered. If your last question went unanswered, don't repeat it: ask a different, easier one. If they've stayed silent twice in a row, give your warm send-off instead." } },
  sessionContext: () => guestBookContext(),
});
