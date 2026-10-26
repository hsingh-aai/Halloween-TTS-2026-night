import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";
import { guestBookContext } from "./guests.ts";

// Jack the Roaster on the ESP32-S3 audio board (aai-device firmware).
// Say the wake word ("Hi Jason"), talk, and Jack answers through the board's speaker.
// Memory: a guest book (guests.ts). Every session starts with the guests Jack has met,
// so a returning guest gets called back by name and job, and never hears a joke twice.
export default agent({
  name: "Jack the Roaster",
  description: "Pumpkin-headed comedian for the Text-to-Screech Halloween happy hour",
  // Silent start: the board's chime already says "I'm listening", and the mic is muted
  // while Jack talks, so a greeting on every wake would swallow "Hi Jack, introduce
  // yourself". (The firmware's ?resume=1 should suppress it, but SDK 0.14 speaks it anyway.)
  greeting: "",
  // tts.us + model_id assemblyai-tts-1 = the launch model (assemblyai-tts-mul-4brem-2026-10-17
  // underneath). The SDK appends its own "?voice=…" after the host, which our trailing "&_"
  // swallows, so the voice must ride in the host too (as voice_id: tts.us retired `voice=`).
  tts: assemblyAITts({
    voice: "george",
    host: "tts.us.assemblyai.com/v1/ws?voice_id=aai-george&model_id=assemblyai-tts-1&language=english&_",
  }),
  // The board's AFE already does echo cancellation and beamforming, and party guests
  // stand back from it, so near-field voice focus would cut them out.
  // A short pause ends a guest's turn (the default 1.6 s drags at a party), while a
  // longer one is still tolerated mid-sentence.
  stt: assemblyAIStt({ voiceFocus: "off", minTurnSilenceMs: 700, maxTurnSilenceMs: 2400 }),
  // Bias transcription toward names guests say that the model would otherwise mishear.
  sttPrompt: "Names that may come up: Harnoor.",
  builtinTools: [],
  maxSteps: 3,
  sessionContext: () => guestBookContext(),
});
