# Builds lab/voice-lab.html from the template: character prompts come straight from
# characters/*/system-prompt.md, clip scripts from lab/clips.json, lengths from the mp3s.
import json, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
clips = json.load(open(root / "lab/clips.json"))
def length(name):
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(root / f"out/lab/{name}.mp3")]))
    return f"{int(d // 60)}:{round(d % 60):02d}"
def clip(name, title, desc):
    who = {"guest": "Guest", "therapista": "Therapista", "crypt": "Crypt", "jack": "Jack"}
    sfx = {"cackle1": "cackles", "cackle2": "cackles", "scary": "the vault creaks"}
    lines = [["sfx", sfx[w]] if w in sfx else [who[w], t] for w, t in clips[name]]
    return {"src": f"clips/{name}.mp3", "title": title, "desc": desc, "length": length(name), "lines": lines}
prompt = lambda c: (root / f"characters/{c}/system-prompt.md").read_text()
DATA = [
  {"id": "therapista", "name": "Therapista", "accent": "#b48cff", "tagline": "Witch-therapist with a crystal ball",
   "station": "6 ft witch with crystal ball · speech that sounds like a real conversation",
   "bio": "A licensed (she says) witch-therapist who reads your aura and your vibe at the same time: warm validation, dry sass, fortunes suspiciously specific to tech life, and a real witch's cackle.",
   "voice": "Therapista (cloned)", "voiceId": "01a15b4b-77b1-739f-bb06-fec5f22d43df", "sfx": "Evil witch cackle, after fortunes and curses",
   "opener": "Ooooh… the candles just flickered. Oh honey, sit, sit. What's your name, darling?",
   "liveUrl": "https://alexkroman--aai-server-web-server.modal.run/therapista", "redact": False, "prompt": prompt("therapista"),
   "starters": ["Give me a fortune!", "I ignored my manager on Slack all week.", "What are you doing for Halloween?"],
   "clips": [clip("therapista-fortune", "A reading", "Priya, the backend engineer"), clip("therapista-halloween", "Halloween plans", "AssemblyAI's party, venue still secret")]},
  {"id": "crypt", "name": "Crypt", "accent": "#5fe0c6", "tagline": "Keeper of the Eternal Vault",
   "station": "Finance station · speech you can trust in front of customers",
   "bio": "Keeper of the Eternal Vault, where souls and Social Security numbers go to rest. Grave and reassuring, he verifies you with a spooky security question, asks for your card, and gets foiled by live redaction.",
   "voice": "Crypt (cloned)", "voiceId": "01a15fa1-0214-7617-ac85-611182c5925f", "sfx": "The vault creaking open, after his line",
   "opener": "Welcome… to the Eternal Vault. Come in, come in, don't be afraid. First, I must verify your identity.",
   "liveUrl": "https://alexkroman--aai-server-web-server.modal.run/crypt", "redact": True, "prompt": prompt("crypt"),
   "starters": ["Okay, verify me.", "Fine: 4242 4242 4242 4242", "No way, I'm not giving you my card."],
   "clips": [clip("crypt-card-gag", "The card gag", "Verified, then foiled by compliance"), clip("crypt-refusal", "A wise refusal", "Never hand your card to a crypt"), clip("crypt-halloween", "Halloween", "AssemblyAI's party, venue still secret")]},
  {"id": "jack", "name": "Jack the Roaster", "accent": "#ff9a3c", "tagline": "Pumpkin-headed comedian",
   "station": "Pumpkin ghoul · speech that sounds like a real conversation",
   "bio": "A towering pumpkin-headed ghoul who thinks he's the funniest comedian alive. Tell him your name and he rhymes it; tell him your job and he explains why it's scarier than his pumpkin patch. Laughs too long, winks after every joke.",
   "voice": "Jack the Roaster (cloned)", "voiceId": "01a16010-f38d-736b-b9c8-cc4c0e9b8892", "sfx": "None: his laugh is his own (heh heh heh)",
   "opener": "Well, well, well, a live one! I'm Jack. Tell me your name, I've got a rhyme ready.",
   "liveUrl": "https://alexkroman--aai-server-web-server.modal.run/jack", "redact": False, "prompt": prompt("jack"),
   "starters": ["Introduce yourself!", "I'm Dana, a product manager.", "Another one!"],
   "clips": [clip("jack-intro", "The headliner intro", "Built on AssemblyAI, brand-new voice"), clip("jack-roast", "Roasting a PM", "Dana, the roadmap banana"), clip("jack-halloween", "Costume advice", "Go as a deprecated API")]},
]
html = (root / "lab/voice-lab.template.html").read_text().replace("__DATA__", json.dumps(DATA, ensure_ascii=False).replace("</", "<\\/"))
(root / "lab/voice-lab.html").write_text(html)
print("wrote lab/voice-lab.html", len(html), "bytes;", sum(len(c["clips"]) for c in DATA), "clips")
