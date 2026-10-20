# Jack the Roaster on hardware

Jack lives in a Waveshare ESP32-S3-AUDIO-Board running [aai-device](https://github.com/alexkroman/aai-device) firmware, and talks to the `agent/` here (an [aai](https://www.npmjs.com/package/@alexkroman1/aai) voice agent) running on a laptop on the same Wi-Fi.

Say **"Hi Jason"** (closest built-in wake word; Jason is Jack's stage name), then talk.

## Things to try
- "Introduce yourself" for the full headliner intro.
- "Give me some Halloween advice" for costume, candy-trading and haunted-house tips with a roast.
- "When's the party?" counts down to Thursday, Oct 29 (it's "tonight" on the day).
- Tell him your name and job, walk away, come back later and say your name again. He remembers you (the guest book) and won't repeat a joke.
- Heckle him, ask for "another one", or ask what he is.

## Run the agent (Node 24+)
```
cd device/agent
npm install
echo "ASSEMBLYAI_API_KEY=..." > .env
AAI_DEV_HOST=0.0.0.0 npx aai dev --port 3000
```
`AAI_DEV_HOST=0.0.0.0` lets the board reach it (the default is localhost only). On macOS, allow `node` through the firewall when asked.

Memory is `agent/data/guests.json` (gitignored): name, job, visits and the jokes Jack told. Delete it to start the party fresh.

## Flash the board (ESP-IDF v5.5)
```
git clone https://github.com/alexkroman/aai-device && cd aai-device/firmware
cat > sdkconfig.defaults.local <<'CFG'
CONFIG_SR_WN_WN9_COMPUTER_TTS=n
CONFIG_SR_WN_WN9_HIJASON_TTS2=y
CONFIG_AAI_AGENT_URL="ws://<your-mac>.local:3000/websocket"
CONFIG_AAI_CLIENT_ID="jack-pumpkin"
CONFIG_AAI_WIFI_SSID="<ssid>"
CONFIG_AAI_WIFI_PASSWORD="<password>"
CONFIG_AAI_FOLLOWUP_MS=6000
CONFIG_AAI_VOLUME=85
CFG
. ~/esp/esp-idf-v5.5/export.sh && idf.py set-target esp32s3 && idf.py -p /dev/cu.usbmodem* flash
```
`sdkconfig.defaults.local` is gitignored upstream; it holds the Wi-Fi password.

## Deployed on the aai studio (no laptop needed)

Jack is published to the aai studio (`npx aai login` once, then `npm run publish:agent` from `device/agent`):
- Agent: https://alexkroman--aai-server-web-server.modal.run/agent
- Studio: https://alexkroman--aai-server-web-server.modal.run/studio/chat/agent
- The board connects to `wss://alexkroman--aai-server-web-server.modal.run/agent/websocket` (set in `CONFIG_AAI_AGENT_URL`, no Wi-Fi compiled in).

Deployed, the guest book lives in the agent's memory for as long as its sandbox runs (usually all night); a redeploy or restart clears it.

## Set the board's Wi-Fi from your phone

The board needs a network with open internet: corporate Wi-Fi that blocks unregistered devices won't work (it can reach a laptop but not the studio). A phone hotspot or the venue's password Wi-Fi is fine; it must be 2.4 GHz, with no "click to accept" page.

1. Install **ESP SoftAP Prov** (Espressif) from the App Store or Google Play.
2. Power the board. With no saved network (or 30 s after the saved one is out of reach) the LED ring glows amber and it broadcasts **`AAI-xxxxxx`** (this board: `AAI-78A3B8`).
3. In the app: **Provision Device**, then **I don't have a QR code**.
4. Join `AAI-xxxxxx` in your phone's Wi-Fi settings (no password), then go back to the app.
5. Proof of possession: **`aai-speaker`**.
6. Pick the network and enter its password. The ring stops glowing amber when it's online.
7. Say **"Hi Jason"**.

To use a phone hotspot, turn on **Maximize Compatibility** (iPhone) so it broadcasts on 2.4 GHz, and provision the board with the hotspot as its network from a second phone, or from the same phone before switching the hotspot on.
