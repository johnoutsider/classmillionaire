"use client";
import { useEffect, useRef, useCallback, useState } from "react";

type SoundName = "thinking" | "correct" | "wrong" | "winner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HowlInstance = any;

export function useGameAudio() {
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 0.7;
    return parseFloat(localStorage.getItem("qs-volume") ?? "0.7");
  });
  const [muted, setMutedState] = useState(false);

  const sounds = useRef<Partial<Record<SoundName, HowlInstance>>>({});
  const ready = useRef(false);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(false);
  volumeRef.current = volume;
  mutedRef.current = muted;

  useEffect(() => {
    let cancelled = false;
    import("howler").then(({ Howl }) => {
      if (cancelled) return;
      const v = mutedRef.current ? 0 : volumeRef.current;
      sounds.current = {
        thinking: new Howl({ src: ["/audio/thinking.mp3"], loop: true, volume: v }),
        correct:  new Howl({ src: ["/audio/correct.mp3"],  loop: false, volume: v }),
        wrong:    new Howl({ src: ["/audio/wrong.mp3"],    loop: false, volume: v }),
        winner:   new Howl({ src: ["/audio/winner.mp3"],   loop: false, volume: v }),
      };
      ready.current = true;
    });
    return () => {
      cancelled = true;
      Object.values(sounds.current).forEach((s) => s?.unload?.());
      sounds.current = {};
      ready.current = false;
    };
  }, []);

  const applyVolume = useCallback((v: number, m: boolean) => {
    const actual = m ? 0 : v;
    Object.values(sounds.current).forEach((s) => s?.volume?.(actual));
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem("qs-volume", String(v));
    applyVolume(v, mutedRef.current);
  }, [applyVolume]);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      applyVolume(volumeRef.current, next);
      return next;
    });
  }, [applyVolume]);

  const play = useCallback((name: SoundName) => {
    if (!ready.current) return;
    const s = sounds.current[name];
    if (!s) return;
    if (name === "thinking") {
      if (!s.playing()) s.play();
    } else {
      s.stop();
      s.play();
    }
  }, []);

  const stop = useCallback((name?: SoundName) => {
    if (!ready.current) return;
    if (name) {
      sounds.current[name]?.stop();
    } else {
      Object.values(sounds.current).forEach((s) => s?.stop?.());
    }
  }, []);

  return { volume, setVolume, muted, toggleMute, play, stop };
}
