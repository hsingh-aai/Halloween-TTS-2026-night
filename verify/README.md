# Character verification

`node verify/verify.js` has scripted guests (spoken by our TTS, streamed in real time) talk to every character and checks each reply:

| Character | Checks |
|---|---|
| Therapista | café greeting, fortune on request without stalling, remembers name + job, refuses to be mean |
| Finance Reaper | "Curses! Foiled by compliance!", masked readback ("star, star, star, star"), never says a digit or reads the number back, praises a refusal, explains redaction |
| Jack (station) | roasts the actual job, joke before any name ask, laughs at himself, rapid-fire "another one", refuses appearance jokes |
| Jack (board) | headliner intro crediting AssemblyAI, knows Oct 29 (countdown), Halloween advice, remembers a returning guest in a new conversation |
| Everyone | ≤ 45 words (intro: 65), no markdown or stage directions, no "As an AI" / "Great question" |

```
node verify/verify.js                     # all four
node verify/verify.js reaper jack         # some
node verify/verify.js device --url wss://alexkroman--aai-server-web-server.modal.run/agent/websocket
```
Device Jack defaults to the local agent (`aai dev` on port 3000). Replies come from a model, so rerun a single failure before changing a prompt. The board check writes a test guest ("Zebulon") into Jack's guest book; clear `device/agent/data/guests.json` before the event.
