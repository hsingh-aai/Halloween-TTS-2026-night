# Text-to-Screech voice agents

Three AssemblyAI Voice Agent API agents for the Oct 29 Halloween launch happy hour, one per animatronic station.

| Station | Agent | Voice | Pillar |
|---|---|---|---|
| `#witch` | Therapista, witch-therapist with a crystal ball | vera | Speech that sounds like a real conversation |
| `#reaper` | The Finance Reaper, asks for your card and gets foiled; numbers are redacted on screen | michael | Speech you can trust in front of customers |
| `#jack` | Jack the Roaster, pumpkin-headed comedian, rhymes your name, roasts your job | george | Speech that sounds like a real conversation |

```
node create-agents.js   # create/update the 3 agents on AssemblyAI (ids saved to agents.json)
node server.js          # station kiosk on http://localhost:4400  ->  /#witch  /#reaper  /#jack
node rehearse.js reaper # talk to an agent with a simulated guest (no mic needed), saves out/rehearsal-reaper.wav
```

Edit personas in `personas.js`, then re-run `create-agents.js` (it updates the same agents in place).

Station setup:
- Use Chrome, open the station link, and allow the microphone.
- Space starts or ends a conversation; Esc ends it. Each token caps a session at 10 minutes.
- Echo cancellation is on, but keep the mic away from the animatronic's speaker, or use a headset mic for the guest.
- Finance Reaper redaction happens on the screen, client-side. The model still hears the number; its prompt forbids repeating it.
