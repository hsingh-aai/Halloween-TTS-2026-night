import { agent } from "@alexkroman1/aai";
import { assemblyAIStt } from "@alexkroman1/aai/stt";
import { assemblyAITts } from "@alexkroman1/aai/tts";

// Latency benchmark agent: the same STT, LLM, TTS and prompt as bench/livekit-ref/agent.py
// (round 2: Universal-3.6 Pro and gemma-4-31b, as in the LiveKit reference agent).
export default agent({
  name: "Bench (aai)",
  greeting: "",
  stt: assemblyAIStt({ model: "universal-3-6-pro", voiceFocus: "off", minTurnSilenceMs: 700, maxTurnSilenceMs: 2400 }),
  llm: "gemma-4-31b", // AssemblyAI LLM Gateway (the default provider)
  tts: assemblyAITts({
    voice: "george",
    host: "tts.us.assemblyai.com/v1/ws?voice_id=aai-george&model_id=assemblyai-tts-1&language=english&_",
  }),
  builtinTools: [],
  maxSteps: 1,
  silence: { deadAirCoverMs: 0 },
});
