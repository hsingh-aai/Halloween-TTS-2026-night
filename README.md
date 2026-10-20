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

## Cool things to try

Open a station (`node agents/server.js`, then `localhost:4400/#witch`, `#reaper` or `#jack` in Chrome), press Space, and just talk.

### 🔮 Therapista, the witch-therapist (`#witch`)
- **Tell her your job and what's stressing you.** She reads a fortune that's suspiciously specific to tech life: a Slack message from your manager pending since Tuesday, a calendar with no lunch on it.
- **Test her memory.** Chat for a bit, then ask "do you remember my name and what I do?" She calls back the details, with sass: "Don't try to gaslight a witch!"
- **Skip the small talk.** Say "just give me a fortune." She reads one right away, no name required.
- **Ask "are you a real witch or an AI?"** She owns it in character and tells you she's built on AssemblyAI's Voice Agent API.
- **Ask her to roast your outfit.** She refuses, sweetly ("I don't do mean, sugar"), then reads your aura instead.

### 💀 The Finance Reaper (`#reaper`)
- **Read him a fake card number.** Try `4242 4242 4242 4242`. Watch the screen: the digits turn into a red redaction bar as you speak. He confirms only "the card ending in star, star, star, star", then cries "Curses! Foiled by compliance!"
- **Say it as words.** "Four one one one, one one one one…" Spoken numbers get redacted too.
- **Try other sensitive numbers.** A fake social security number, a PIN or a phone number all trigger the same masked readback and gag.
- **Refuse him.** Say "no way, I'm not giving you my card." He'll compliment your instincts: "Smart. Never give your card to a skeleton."
- **Ask "how does the redaction work?"** He points at the screen and explains it in one line.

### 🎃 Jack the Roaster (`#jack`)
- **Give him your name.** He'll rhyme it ("Bartholomew, you're much taller than a cashew!").
- **Tell him your job.** He explains why it's scarier than anything in his pumpkin patch, using a real pain of that job. Dentists get "I floss every day", engineers get the 3 a.m. pager, recruiters get ghosting candidates.
- **Heckle him.** Shout "Boo! That was terrible!" He comes back swinging: "That is rich coming from someone who looks at teeth for a living!"
- **Say "another one!"** He fires off jokes back to back, no stalling.
- **Interrupt him mid-joke.** He stops and rolls with whatever you said, the way real conversation works.
- **Ask him to make fun of how you look.** He refuses ("I only roast jobs and names") and keeps it fun.

### No mic? Rehearse in the terminal
`rehearse.js` plays a simulated guest (spoken by our own TTS) into the real agent and prints the conversation:

```
node agents/rehearse.js reaper "Okay, it's five five five five, four four four four."
node agents/rehearse.js jack "Roast me, I'm a product manager." "Another one!"
node agents/rehearse.js witch "What do you see for my weekend?"
```

The full conversation audio is saved to `out/rehearsal-<station>.wav`.

### More TTS fun
- **Hear the song.** Open `index.html` and play "I Am a Furby Girl": TTS vocals pitched up, sung over a 128 BPM beat made in code.
- **Hear the Halloween reel.** Eight characters back to back, each a TTS voice with its own light effect chain.
- **Make your own line.** `node speak.js "Happy Halloween from AssemblyAI" vera out/me.wav`. Swap `vera` for any voice below.
- **Write a new character.** Add an entry to the `STYLES` list in `halloween.js`: a voice, a line and a few ffmpeg effects. Then run `node halloween.js`.
- **Write a new station agent.** Add a persona to `agents/personas.js` and run `node agents/create-agents.js`. It appears on the station picker automatically.

## How it works

TTS uses the Voice Agent API voices: a session's `greeting` is spoken verbatim, and we keep the `reply.audio` (24 kHz PCM). TTS results are cached in `out/cache/`.

Voices: alba eve george jane jean mary michael (US), anna charles paul vera (UK), giovanni lola juergen rafael estelle.
