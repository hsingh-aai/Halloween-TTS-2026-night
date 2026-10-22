"""LiveKit side of the latency benchmark: joins a fresh room (the worker auto-dispatches the
agent), streams each guest utterance in real time like a microphone (then keeps streaming
silence), and times end-of-speech -> first audible agent audio.

    python client.py <mode> <round>   -> appends to ../results.jsonl
"""

import asyncio
import json
import pathlib
import sys
import time

import numpy as np
from livekit import api, rtc

HERE = pathlib.Path(__file__).resolve().parent
UTT = HERE.parent / "utterances"
RESULTS = HERE.parent / "results.jsonl"
RATE, FRAME = 48000, 480  # 10 ms frames
AUDIBLE = 500  # int16 RMS that counts as the agent speaking


def frames_of(pcm24: bytes):
    s = np.frombuffer(pcm24, dtype=np.int16).astype(np.float32)
    up = np.interp(np.arange(0, len(s), 0.5), np.arange(len(s)), s).astype(np.int16)  # 24k -> 48k
    for i in range(0, len(up), FRAME):
        chunk = up[i : i + FRAME]
        if len(chunk) < FRAME:
            chunk = np.pad(chunk, (0, FRAME - len(chunk)))
        yield chunk


async def main(mode: str, rnd: int):
    room_name = f"bench-{mode}-{rnd}-{int(time.time())}"
    token = (
        api.AccessToken("devkey", "secret")
        .with_identity("guest")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )
    room = rtc.Room()
    agent_audio: asyncio.Queue = asyncio.Queue()

    @room.on("track_subscribed")
    def _on_track(track, _pub, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            async def pump():
                async for ev in rtc.AudioStream(track, sample_rate=RATE, num_channels=1):
                    data = np.frombuffer(ev.frame.data, dtype=np.int16)
                    rms = float(np.sqrt(np.mean(data.astype(np.float32) ** 2))) if len(data) else 0.0
                    agent_audio.put_nowait((time.perf_counter(), rms))
            asyncio.ensure_future(pump())

    await room.connect("ws://localhost:7880", token)
    source = rtc.AudioSource(RATE, 1, queue_size_ms=50)
    track = rtc.LocalAudioTrack.create_audio_track("mic", source)
    await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))

    silence = np.zeros(FRAME, dtype=np.int16)
    speech: list = []  # frames queued to "say"; one feeder sends them, else silence (a live mic)
    speech_done: dict = {}

    async def feeder():
        while True:
            frame = speech.pop(0) if speech else silence
            await source.capture_frame(rtc.AudioFrame(frame.tobytes(), RATE, 1, FRAME))
            if frame is not silence and not speech and "fut" in speech_done:
                speech_done.pop("fut").set_result(time.perf_counter())

    idler = asyncio.ensure_future(feeder())
    # wait for the agent to join and settle
    t0 = time.perf_counter()
    while not any(p.identity.startswith("agent") for p in room.remote_participants.values()) and time.perf_counter() - t0 < 20:
        await asyncio.sleep(0.1)
    await asyncio.sleep(3.0)

    meta = json.loads((UTT / "utterances.json").read_text())
    for i, u in enumerate(meta):
        while not agent_audio.empty():
            agent_audio.get_nowait()
        done = asyncio.get_running_loop().create_future()
        speech_done["fut"] = done
        speech.extend(frames_of((UTT / u["file"]).read_bytes()))
        t_end = await done
        latency = None
        last_loud = None
        deadline = t_end + 20
        while time.perf_counter() < deadline:
            try:
                ts, rms = await asyncio.wait_for(agent_audio.get(), timeout=0.5)
            except asyncio.TimeoutError:
                if latency is not None and last_loud and time.perf_counter() - last_loud > 1.5:
                    break
                continue
            if rms > AUDIBLE and ts > t_end:
                if latency is None:
                    latency = (ts - t_end) * 1000
                last_loud = ts
            if latency is not None and last_loud and ts - last_loud > 1.5:
                break
        row = {"framework": f"livekit-{mode}", "round": rnd, "utt": i, "latency_ms": round(latency, 1) if latency else None}
        print(row, flush=True)
        with RESULTS.open("a") as f:
            f.write(json.dumps(row) + "\n")
        await asyncio.sleep(1.0)

    idler.cancel()
    await room.disconnect()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], int(sys.argv[2])))
