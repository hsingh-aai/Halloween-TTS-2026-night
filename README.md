# Halloween TTS 2026 Night

AssemblyAI text-to-speech demos for the Oct 29, 2026 Text-to-Screech launch happy hour.

- **Voice agents** (`agents/`): three live Voice Agent API characters, one per animatronic station: Therapista the witch-therapist, the Finance Reaper (with on-screen number redaction), and Jack the Roaster. See [agents/README.md](agents/README.md).
- **Furby song** (`furby-song.js`): "I Am a Furby Girl", a pop track built from TTS lines plus a JS-synthesized beat.
- **Halloween voices** (`halloween.js`): eight characters (demon, ghost, witch, vampire, zombie, robot, haunted radio, possessed child), each a TTS voice with a light ffmpeg effect chain and atmosphere.

## Setup

Node 22+, ffmpeg, Chrome for the stations.

```
cp .env.example .env      # paste your AssemblyAI key
```

## Run

```
node agents/create-agents.js   # create/update the 3 station agents
node agents/server.js          # stations on http://localhost:4400  (/#witch /#reaper /#jack)
node agents/rehearse.js jack   # test an agent with a simulated guest, no mic needed

node furby-song.js             # -> out/furby-girl.mp3
node halloween.js              # -> out/halloween-*.mp3 + reel
open index.html                # simple player (playground.html is the published page)
node speak.js "Hello" alba out/hello.wav   # one-off line in any voice
```

TTS uses the Voice Agent API voices: a session's `greeting` is spoken verbatim, and we keep the `reply.audio` (24 kHz PCM). TTS results are cached in `out/cache/`.

Voices: alba eve george jane jean mary michael (US), anna charles paul vera (UK), giovanni lola juergen rafael estelle.
