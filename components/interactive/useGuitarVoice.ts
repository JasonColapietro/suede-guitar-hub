"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { openGuitarVoice, type GuitarVoice } from "@/lib/audio/pluck";

/**
 * One demonstration voice per component. Opened on the first tap (browsers
 * only allow sound after a gesture), reused for later taps, and closed when
 * the page hides, another audio tool starts, or the component unmounts.
 */
export function useGuitarVoice() {
  const voice = useRef<GuitarVoice | null>(null);
  const opening = useRef<Promise<GuitarVoice> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const [interrupted, setInterrupted] = useState(0);

  const close = useCallback(() => { abort.current?.abort(); abort.current = null; voice.current = null; opening.current = null; }, []);
  useEffect(() => {
    const hidden = () => { if (document.hidden) close(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", close);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", close); close(); };
  }, [close]);

  const get = useCallback(async () => {
    if (voice.current) return voice.current;
    if (opening.current) return opening.current;
    const controller = new AbortController();
    abort.current = controller;
    setError("");
    opening.current = openGuitarVoice(() => { voice.current = null; opening.current = null; setInterrupted(n => n + 1); }, controller.signal)
      .then(opened => { voice.current = opened; return opened; })
      .catch(reason => { opening.current = null; if (!controller.signal.aborted) setError("Sound could not start. Check your volume and silent switch, then tap again."); throw reason; });
    return opening.current;
  }, []);

  return { get, close, error, interrupted };
}
