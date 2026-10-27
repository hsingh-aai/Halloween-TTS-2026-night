"""Latency benchmark round 2: AssemblyAI's LiveKit reference agent
(github.com/AssemblyAI/assemblyai-livekit-reference-voice-agent) with the benchmark's prompt
and voice. BENCH_MODE=ref keeps the reference's turn settings (STT mode "balanced");
BENCH_MODE=ref700 pins the turn silence to 700/2400 ms like bench/aai-agent and the characters.

    LIVEKIT_URL=ws://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret \\
      BENCH_MODE=ref .venv/bin/python agent.py dev
"""

import json
import os
import pathlib
import time

from livekit.agents import AgentServer, Agent, AgentSession, JobContext, JobProcess, MetricsCollectedEvent, TurnHandlingOptions, cli
from livekit.plugins import assemblyai, openai, silero

ROOT = pathlib.Path(__file__).resolve().parents[2]
KEY = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("ASSEMBLY_AI_KEY="))
PROMPT = (ROOT / "bench/aai-agent/system-prompt.md").read_text().strip()
MODE = os.environ.get("BENCH_MODE", "ref")
METRICS = pathlib.Path(__file__).with_name(f"metrics-{MODE}.jsonl")
VAD_THRESHOLD = 0.2

server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load(activation_threshold=VAD_THRESHOLD)


server.setup_fnc = prewarm


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    silences = {"min_turn_silence": 700, "max_turn_silence": 2400} if MODE == "ref700" else {}
    tts = assemblyai.TTS(api_key=KEY, voice="aai-george")
    tts.prewarm()
    session = AgentSession(
        stt=assemblyai.STT(api_key=KEY, model="universal-3-6-pro", mode="balanced", vad_threshold=VAD_THRESHOLD, **silences),
        llm=openai.LLM(model="gemma-4-31b", base_url="https://llm-gateway.assemblyai.com/v1", api_key=KEY),
        tts=tts,
        vad=ctx.proc.userdata["vad"],
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing={"min_delay": 0},
            interruption={"resume_false_interruption": True},
        ),
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
    cli.run_app(server)
