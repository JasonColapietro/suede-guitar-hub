import { openGuitarVoice, type GuitarVoice } from "./pluck.ts";

type VoiceRequest = {
  controller: AbortController;
  voice: GuitarVoice | null;
  opening: Promise<GuitarVoice> | null;
};

/** Owns one voice, including a pending browser audio permission/resume request. */
export function createGuitarVoiceSession(
  onInterrupted: () => void,
  onError: (message: string) => void,
  open = openGuitarVoice,
) {
  let current: VoiceRequest | null = null;

  function close() {
    const previous = current;
    current = null;
    previous?.controller.abort();
    previous?.voice?.stop();
  }

  function interrupt() {
    if (!current) return;
    close();
    onInterrupted();
  }

  function get(): Promise<GuitarVoice> {
    if (current?.voice) return Promise.resolve(current.voice);
    if (current?.opening) return current.opening;
    const request: VoiceRequest = {
      controller: new AbortController(),
      voice: null,
      opening: null,
    };
    current = request;
    onError("");
    request.opening = open(() => {
      if (current === request) interrupt();
    }, request.controller.signal)
      .then(voice => {
        if (current !== request || request.controller.signal.aborted) {
          voice.stop();
          throw new Error("Playback was cancelled.");
        }
        request.voice = voice;
        return voice;
      })
      .catch(reason => {
        // A cancelled request can settle after a replacement has already opened.
        if (current === request) {
          close();
          onError("Sound could not start. Check your volume and silent switch, then tap again.");
        }
        throw reason;
      });
    return request.opening;
  }

  return { get, close, interrupt };
}
