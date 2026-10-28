/// <reference types="vite/client" />
import "@alexkroman1/aai-ui/styles.css";
import { mountClient, useEvent, useSession } from "@alexkroman1/aai-ui";
import { useEffect, useRef, useState } from "react";
import { scream } from "./sounds.ts";

// The pumpkin patch stage. Jack's pumpkin scream plays right after he finishes a line (mic
// muted meanwhile, so he doesn't hear it as the guest), plus once after his greeting.

function Stage() {
  const { state, messages, userTranscript, agentTranscript, started, start, end, setMicMuted } = useSession();
  const [pending, setPending] = useState(0);
  const [playing, setPlaying] = useState(false);
  // One scream per line, however many times he asks for it.
  const queuedAt = useRef(0);
  const queue = () => {
    if (Date.now() - queuedAt.current < 6000) return;
    queuedAt.current = Date.now();
    setPending((n) => n + 1);
  };
  useEvent("scream", queue);

  // The pumpkin screams right after his greeting.
  const greeted = useRef(false);
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (state === "speaking") wasSpeaking.current = true;
    else if (wasSpeaking.current && !greeted.current) {
      greeted.current = true;
      queue();
    }
    if (state === "disconnected" || state === "ready") greeted.current = wasSpeaking.current = false;
  }, [state]);

  useEffect(() => {
    if (!pending || playing || state === "speaking") return;
    const audio = new Audio(scream);
    setPlaying(true);
    setMicMuted(true);
    const done = () => {
      setMicMuted(false);
      setPlaying(false);
      setPending((n) => n - 1);
    };
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.play().catch(done);
  }, [pending, playing, state, setMicMuted]);

  const log = useRef<HTMLDivElement>(null);
  useEffect(() => log.current?.scrollTo(0, log.current.scrollHeight), [messages, userTranscript, agentTranscript]);

  return (
    <div style={{ minHeight: "100vh", background: "#1d1b16", color: "#fdfcf8", fontFamily: "system-ui, sans-serif", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      <header style={{ padding: "16px 20px", borderBottom: "1px solid #4a4945" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c7c3b2" }}>The pumpkin patch stage</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Jack the Roaster</div>
      </header>
      <div ref={log} style={{ overflowY: "auto", padding: "20px clamp(16px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "46ch", fontSize: 20, lineHeight: 1.4 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: m.role === "user" ? "#a5a4a2" : "#887bdd" }}>{m.role === "user" ? "Guest" : "Jack"}</div>
            {m.content}
          </div>
        ))}
        {userTranscript ? <div style={{ alignSelf: "flex-end", maxWidth: "46ch", fontSize: 20, opacity: 0.6 }}>{userTranscript}</div> : null}
        {!messages.length && !userTranscript ? <p style={{ margin: "auto", color: "#a5a4a2" }}>Press Step on stage, then tell Jack your name and your job.</p> : null}
      </div>
      <footer style={{ padding: 16, borderTop: "1px solid #4a4945", display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        {!started ? (
          <button onClick={start} style={btn}>Step on stage</button>
        ) : (
          <button onClick={end} style={{ ...btn, background: "transparent", color: "#fdfcf8", border: "1px solid #887bdd" }}>Leave the stage</button>
        )}
        <span style={{ color: "#a5a4a2", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{playing ? "🎃 the pumpkin screams…" : state}</span>
      </footer>
    </div>
  );
}

const btn = { background: "#887bdd", color: "#1d1b16", border: 0, borderRadius: 4, padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" } as const;

mountClient({ component: Stage });
