import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ProximityLevel } from "@/lib/kalman-filter";

/**
 * Proximity → beep interval in milliseconds.
 * Shorter interval = faster beeping = closer device.
 */
function beepIntervalForProximity(level: ProximityLevel): number {
  switch (level) {
    case "RIGHT_HERE": return 200;  // very fast
    case "CLOSE":      return 400;
    case "NEAR":       return 900;
    case "FAR":        return 2000;
    case "LOST":       return 0;    // silent
  }
}

/**
 * Audio feedback hook for the Finder screen.
 *
 * Uses the Web Audio API (AudioContext) on web, and expo-audio on native.
 * Generates a 880Hz sine-wave beep whose interval scales with proximity.
 *
 * On native we synthesize beeps via expo-audio if available, otherwise
 * we fall back to haptic-only mode (handled in the parent component).
 */
export function useFinderAudio(
  proximity: ProximityLevel,
  enabled: boolean,
  signalLost: boolean,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Initialise Web Audio context (web only)
  const initAudio = useCallback(() => {
    if (Platform.OS !== "web") {
      setIsAudioReady(true);
      return;
    }
    if (!audioCtxRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
          setIsAudioReady(true);
        }
      } catch {
        // AudioContext not available
      }
    } else {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      setIsAudioReady(true);
    }
  }, []);

  // Play a single beep (web only)
  const playBeep = useCallback((freq = 880, durationMs = 80) => {
    if (Platform.OS !== "web") return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // ignore
    }
  }, []);

  // Manage the beep interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled || !isAudioReady || signalLost) return;

    const interval = beepIntervalForProximity(proximity);
    if (interval === 0) return;

    // Play immediately, then on interval
    playBeep();
    intervalRef.current = setInterval(() => {
      playBeep();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [proximity, enabled, isAudioReady, signalLost, playBeep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { initAudio, isAudioReady };
}
