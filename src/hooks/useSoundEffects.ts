import { useCallback, useRef } from 'react';

/**
 * useSoundEffects — Sons courts et discrets pour le HUD cognitif
 * Utilise l'API Web Audio pour générer des sons procéduraux (pas de fichiers)
 */

type SoundEffect = 'cardAppear' | 'cardDismiss' | 'send' | 'success' | 'error' | 'action' | 'thinking';

const audioCtxRef = { current: null as AudioContext | null };

function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }
  return audioCtxRef.current;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  fadeOut = true,
) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — fail silently
  }
}

function playChord(frequencies: number[], duration: number, volume = 0.05) {
  frequencies.forEach((f, i) => {
    setTimeout(() => playTone(f, duration, 'sine', volume), i * 30);
  });
}

const EFFECTS: Record<SoundEffect, () => void> = {
  cardAppear: () => {
    // Rising two-note chime
    playTone(880, 0.12, 'sine', 0.06);
    setTimeout(() => playTone(1174, 0.15, 'sine', 0.05), 60);
  },
  cardDismiss: () => {
    // Falling soft tone
    playTone(660, 0.1, 'sine', 0.04);
    setTimeout(() => playTone(440, 0.12, 'sine', 0.03), 50);
  },
  send: () => {
    // Quick whoosh-like sweep
    playTone(520, 0.08, 'triangle', 0.05);
    setTimeout(() => playTone(780, 0.1, 'triangle', 0.04), 40);
  },
  success: () => {
    // Bright ascending chord
    playChord([523, 659, 784], 0.2, 0.04);
  },
  error: () => {
    // Low buzz
    playTone(220, 0.15, 'sawtooth', 0.04);
    setTimeout(() => playTone(185, 0.12, 'sawtooth', 0.03), 80);
  },
  action: () => {
    // Click/tap
    playTone(1046, 0.05, 'square', 0.03);
  },
  thinking: () => {
    // Soft ambient pulse
    playTone(440, 0.25, 'sine', 0.03);
  },
};

export function useSoundEffects() {
  const enabledRef = useRef(true);

  const play = useCallback((effect: SoundEffect) => {
    if (!enabledRef.current) return;
    EFFECTS[effect]?.();
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return { play, toggle, isEnabled: () => enabledRef.current };
}
