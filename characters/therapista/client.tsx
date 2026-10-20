/// <reference types="vite/client" />
import "@alexkroman1/aai-ui/styles.css";
import { mountClient, useEvent, useSession } from "@alexkroman1/aai-ui";
import { useEffect, useRef, useState } from "react";
import { cackle1, cackle2 } from "./cackles.ts";

// Plays the real witch cackle when Therapista calls the `cackle` tool: it waits until
// she stops speaking (so it lands as the punchline), mutes the mic while it plays (so
// she doesn't hear her own laugh as the guest), then hands the floor back.
const CACKLES = [cackle1, cackle2];

function Cackle() {
  const { state, setMicMuted } = useSession();
  const [pending, setPending] = useState(0);
  const [playing, setPlaying] = useState(false);
  const next = useRef(0);

  useEvent("cackle", () => setPending((n) => n + 1));

  // Every conversation opens with a cackle: right after her greeting finishes.
  const greeted = useRef(false);
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (state === "speaking") wasSpeaking.current = true;
    else if (wasSpeaking.current && !greeted.current) {
      greeted.current = true;
      setPending((n) => n + 1);
    }
    if (state === "disconnected" || state === "ready") {
      greeted.current = false;
      wasSpeaking.current = false;
    }
  }, [state]);

  useEffect(() => {
    if (!pending || playing || state === "speaking") return;
    const audio = new Audio(CACKLES[next.current++ % CACKLES.length]);
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

  return (
    <div className="p-4 text-sm opacity-80">
      {playing ? "🧙‍♀️ *cackles*" : "🔮 Therapista is listening"}
    </div>
  );
}

mountClient({ name: "Therapista", sidebar: Cackle });
