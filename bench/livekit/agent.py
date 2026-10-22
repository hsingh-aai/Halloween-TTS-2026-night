"""Latency benchmark agent on LiveKit Agents: the same STT, LLM, TTS and prompt as
bench/aai-agent. BENCH_MODE=default keeps LiveKit's turn-handling defaults; BENCH_MODE=tuned
removes its extra endpointing delay and turns preemptive generation on.

    LIVEKIT_URL=ws://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret \
      BENCH_MODE=default python agent.py dev
"""

import json
import os
import pathlib
import time

import assemblyai_tts
from livekit.agents import Agent, AgentSession, JobContext, MetricsCollectedEvent, WorkerOptions, cli
from livekit.plugins import assemblyai, openai, silero

ROOT = pathlib.Path(__file__).resolve().parents[2]
KEY = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("ASSEMBLY_AI_KEY="))
PROMPT = (ROOT / "bench/aai-agent/system-prompt.md").read_text().strip()
MODE = os.environ.get("BENCH_MODE", "default")
METRICS = pathlib.Path(__file__).with_name(f"metrics-{MODE}.jsonl")


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    extra = {"min_endpointing_delay": 0.0, "preemptive_generation": True} if MODE == "tuned" else {}
    session = AgentSession(
        stt=assemblyai.STT(api_key=KEY, model="universal-3-5-pro", min_turn_silence=700, max_turn_silence=2400),
        llm=openai.LLM(model="gpt-5.6-luna", api_key=KEY, base_url="https://llm-gateway.assemblyai.com/v1", reasoning_effort="none"),
        tts=assemblyai_tts.TTS(api_key=KEY, voice_id="aai-george", model="assemblyai-tts-1", sample_rate=24000),
        vad=silero.VAD.load(),
        turn_detection="stt",
        **extra,
    )

    @session.on("metrics_collected")
    def _on_metrics(ev: MetricsCollectedEvent):
        m = ev.metrics
        row = {"t": time.time(), "type": type(m).__name__}
        for k in ("end_of_utterance_delay", "transcription_delay", "ttft", "ttfb", "duration", "on_user_turn_completed_delay"):
            v = getattr(m, k, None)
            if isinstance(v, (int, float)):
                row[k] = round(v * 1000, 1)
        with METRICS.open("a") as f:
            f.write(json.dumps(row) + "\n")

    await session.start(agent=Agent(instructions=PROMPT), room=ctx.room)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
