"use client";
import { useEffect, useState } from "react";
import { createGuitarVoiceSession } from "@/lib/audio/guitar-voice-session";

/** One demonstration voice; backgrounding cancels audio and resets its player. */
export function useGuitarVoice() {
  const [error, setError] = useState("");
  const [interrupted, setInterrupted] = useState(0);
  const [session] = useState(() => createGuitarVoiceSession(
    () => setInterrupted(value => value + 1),
    setError,
  ));

  useEffect(() => {
    const hidden = () => { if (document.hidden) session.interrupt(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", session.interrupt);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", session.interrupt);
      session.close();
    };
  }, [session]);

  return { get: session.get, close: session.close, error, interrupted };
}
