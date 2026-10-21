/// <reference types="vite/client" />
import "@alexkroman1/aai-ui/styles.css";
import { mountClient, useEvent, useSession } from "@alexkroman1/aai-ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { scary } from "./sounds.ts";

// The Eternal Vault screen. Every number a guest says is redacted as it's spoken (the demo's
// point), and Crypt's scary sound plays right after he finishes a line (mic muted meanwhile,
// so he doesn't hear it as the guest), plus once after his greeting.

const NUM_WORDS =
  "zero|oh|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|double|triple";
const WORD_RUN = new RegExp(`\\b(?:(?:${NUM_WORDS})[\\s,\\-]+){2,}(?:${NUM_WORDS})\\b`, "gi");
const DIGITS = /\d[\d\s\-–.,]*\d|\d/g;

function Redacted({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = [];
  const masked = text.replace(WORD_RUN, "\u0000").replace(DIGITS, "\u0000");
  masked.split("\u0000").forEach((chunk, i, all) => {
    parts.push(chunk);
    if (i < all.length - 1) parts.push(<span key={i} style={chip}>REDACTED</span>);
  });
  return <>{parts}</>;
}

const chip = { background: "#e5484d", color: "#fff", borderRadius: 4, padding: "0 6px", fontFamily: "ui-monospace, monospace", fontSize: "0.8em", fontWeight: 700 } as const;

function Vault() {
  const { state, messages, userTranscript, agentTranscript, started, start, end, setMicMuted } = useSession();
  const [pending, setPending] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEvent("scary_sound", () => setPending((n) => n + 1));

  // The vault creaks open right after his greeting.
  const greeted = useRef(false);
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (state === "speaking") wasSpeaking.current = true;
    else if (wasSpeaking.current && !greeted.current) {
      greeted.current = true;
      setPending((n) => n + 1);
    }
    if (state === "disconnected" || state === "ready") greeted.current = wasSpeaking.current = false;
  }, [state]);

  useEffect(() => {
    if (!pending || playing || state === "speaking") return;
    const audio = new Audio(scary);
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
    <div style={{ minHeight: "100vh", background: "#0d0f12", color: "#e8e6e3", fontFamily: "system-ui, sans-serif", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      <header style={{ padding: "16px 20px", borderBottom: "1px solid #23262b", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b9099" }}>The Eternal Vault</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Crypt</div>
        </div>
        <div style={{ color: "#e5484d", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>● LIVE REDACTION ON</div>
      </header>
      <div ref={log} style={{ overflowY: "auto", padding: "20px clamp(16px, 4vw, 40px)", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "46ch", fontSize: 20, lineHeight: 1.4 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: m.role === "user" ? "#8b9099" : "#5fe0c6" }}>{m.role === "user" ? "Guest" : "Crypt"}</div>
            <Redacted text={m.content} />
          </div>
        ))}
        {userTranscript ? (
          <div style={{ alignSelf: "flex-end", maxWidth: "46ch", fontSize: 20, opacity: 0.6 }}>
            <Redacted text={userTranscript} />
          </div>
        ) : null}
        {!messages.length && !userTranscript ? <p style={{ margin: "auto", color: "#8b9099" }}>Press Enter the vault, then talk. Any number you say is redacted here.</p> : null}
      </div>
      <footer style={{ padding: 16, borderTop: "1px solid #23262b", display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        {!started ? (
          <button onClick={start} style={btn}>Enter the vault</button>
        ) : (
          <button onClick={end} style={{ ...btn, background: "transparent", color: "#e8e6e3", border: "1px solid #5fe0c6" }}>Leave the vault</button>
        )}
        <span style={{ color: "#8b9099", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
          {playing ? "🗝️ the vault creaks…" : state}
        </span>
      </footer>
    </div>
  );
}

const btn = { background: "#5fe0c6", color: "#0d0f12", border: 0, borderRadius: 999, padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" } as const;

mountClient({ component: Vault });
