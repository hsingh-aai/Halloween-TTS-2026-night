# Therapista (cloned voice + real cackle)

The witch-therapist as an aai agent: her persona (warm, sassy, spooky, AssemblyAI-first about Halloween), her cloned voice (`voices/voices.json`), and a `cackle` tool.

- Published: https://alexkroman--aai-server-web-server.modal.run/therapista (studio: `/studio/chat/therapista`)
- Local: `AAI_DEV_WATCH=0 npx aai dev --port 3001` (Node 24), then open http://localhost:3001
- Board: aai-device firmware with `CONFIG_AAI_AGENT_URL="https://…/therapista"` and `CONFIG_AAI_WAKE_PHRASES="hey witch;hi witch"`. Say "Hey witch", then talk.

The cackle: the agent calls `cackle` (most replies). The browser page (`client.tsx`) and the board firmware both play a real witch-laugh recording after her sentence finishes, with the mic muted meanwhile.

Not in git: `laughs/` and `cackles.ts` (cut from a downloaded sound effect; check its license before sharing) and the firmware's `sounds/cackle_*.pcm`. Rebuild them from the effect with ffmpeg: takes at 1.05-3.95 s and 5.35-8.45 s.

The cloned voice reaches the SDK through `assemblyAITts({ host })` (the SDK has no voice_id option); the server confirms `voice: "custom"`.
