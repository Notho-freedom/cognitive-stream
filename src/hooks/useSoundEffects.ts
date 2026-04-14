import { useCallback } from 'react';

/**
 * useSoundEffects — Sons courts et discrets pour le HUD cognitif
 * Utilise des fichiers audio (et fallback en Web Audio si indisponible)
 */

type SoundEffect =
  | 'cardAppear'
  | 'cardDismiss'
  | 'send'
  | 'success'
  | 'error'
  | 'action'
  | 'thinking'
  | 'explorerOpen'
  | 'explorerClose'
  | 'moveSuccess';

type SoundSource = {
  url: string;
  volume: number;
  maxDurationMs?: number;
};

const SOUND_SOURCES: Record<SoundEffect, SoundSource> = {
  cardAppear: {
    url: new URL('../soundEffect/ES_Hitech GUI, Scifi, Interact, Digital, Glitch 03 - Epidemic Sound - 0478-1976.wav', import.meta.url).href,
    volume: 0.45,
    maxDurationMs: 900,
  },
  cardDismiss: {
    url: new URL('../soundEffect/ES_Sci Fi Games, UI Menu, Very Short, Close 03 - Epidemic Sound - 0000-0233.wav', import.meta.url).href,
    volume: 0.55,
    maxDurationMs: 500,
  },
  send: {
    url: new URL('../soundEffect/ES_Button Press Click, Tap, Video Game, Back, Return, Negative - Epidemic Sound.wav', import.meta.url).href,
    volume: 0.5,
    maxDurationMs: 500,
  },
  success: {
    url: new URL('../soundEffect/ES_Hitech GUI, Scifi, Interact, Digital, Glitch 03 - Epidemic Sound - 1948-2967.wav', import.meta.url).href,
    volume: 0.5,
    maxDurationMs: 900,
  },
  error: {
    url: new URL('../soundEffect/ES_Futuristic Technology, Control Room, UI Alarm 01 - Epidemic Sound.wav', import.meta.url).href,
    volume: 0.45,
    maxDurationMs: 1200,
  },
  action: {
    url: new URL('../soundEffect/ES_Glitch Hit Noise Burst and Metallic Tone - Epidemic Sound - 0000-0504.wav', import.meta.url).href,
    volume: 0.45,
    maxDurationMs: 650,
  },
  thinking: {
    url: new URL('../soundEffect/ES_Computer, Futuristic, Data Processing, Loading 13 - Epidemic Sound.wav', import.meta.url).href,
    volume: 0.35,
    maxDurationMs: 1400,
  },
  explorerOpen: {
    url: new URL('../soundEffect/ES_Hitech GUI, Scifi, Interact, Digital, Glitch 03 - Epidemic Sound - 0478-1976.wav', import.meta.url).href,
    volume: 0.35,
    maxDurationMs: 500,
  },
  explorerClose: {
    url: new URL('../soundEffect/ES_Sci Fi Games, UI Menu, Very Short, Close 03 - Epidemic Sound - 0000-0233.wav', import.meta.url).href,
    volume: 0.45,
    maxDurationMs: 400,
  },
  moveSuccess: {
    url: new URL('../soundEffect/ES_Hitech GUI, Scifi, Interact, Digital, Glitch 03 - Epidemic Sound - 1948-2967.wav', import.meta.url).href,
    volume: 0.4,
    maxDurationMs: 500,
  },
};

const audioCtxRef = { current: null as AudioContext | null };
const audioCacheRef = { current: {} as Record<SoundEffect, HTMLAudioElement> };
const soundEnabledRef = { current: true };

function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }
  return audioCtxRef.current;
}

function getAudio(effect: SoundEffect): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;

  if (!audioCacheRef.current[effect]) {
    const audio = new Audio(SOUND_SOURCES[effect].url);
    audio.preload = 'auto';
    audio.volume = SOUND_SOURCES[effect].volume;
    audioCacheRef.current[effect] = audio;
  }

  return audioCacheRef.current[effect];
}

function playClip(effect: SoundEffect): boolean {
  try {
    const base = getAudio(effect);
    if (!base) return false;

    const { volume, maxDurationMs } = SOUND_SOURCES[effect];
    const instance = base.cloneNode(true) as HTMLAudioElement;
    instance.volume = volume;
    instance.currentTime = 0;

    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    if (maxDurationMs) {
      stopTimer = setTimeout(() => {
        instance.pause();
        instance.currentTime = 0;
      }, maxDurationMs);

      instance.addEventListener('ended', () => {
        if (stopTimer) clearTimeout(stopTimer);
      }, { once: true });
    }

    void instance.play();
    return true;
  } catch {
    return false;
  }
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

const FALLBACK_EFFECTS: Record<SoundEffect, () => void> = {
  cardAppear: () => {
    playTone(880, 0.12, 'sine', 0.06);
    setTimeout(() => playTone(1174, 0.15, 'sine', 0.05), 60);
  },
  cardDismiss: () => {
    playTone(660, 0.1, 'sine', 0.04);
    setTimeout(() => playTone(440, 0.12, 'sine', 0.03), 50);
  },
  send: () => {
    playTone(520, 0.08, 'triangle', 0.05);
    setTimeout(() => playTone(780, 0.1, 'triangle', 0.04), 40);
  },
  success: () => {
    playChord([523, 659, 784], 0.2, 0.04);
  },
  error: () => {
    playTone(220, 0.15, 'sawtooth', 0.04);
    setTimeout(() => playTone(185, 0.12, 'sawtooth', 0.03), 80);
  },
  action: () => {
    playTone(1046, 0.05, 'square', 0.03);
  },
  thinking: () => {
    playTone(440, 0.25, 'sine', 0.03);
  },
  explorerOpen: () => {
    playTone(740, 0.08, 'triangle', 0.04);
    setTimeout(() => playTone(1040, 0.1, 'triangle', 0.035), 35);
  },
  explorerClose: () => {
    playTone(520, 0.08, 'triangle', 0.04);
    setTimeout(() => playTone(390, 0.09, 'triangle', 0.03), 35);
  },
  moveSuccess: () => {
    playChord([659, 784], 0.18, 0.035);
  },
};

export function useSoundEffects() {
  const play = useCallback((effect: SoundEffect) => {
    if (!soundEnabledRef.current) return;
    const played = playClip(effect);
    if (!played) {
      FALLBACK_EFFECTS[effect]?.();
    }
  }, []);

  const toggle = useCallback(() => {
    soundEnabledRef.current = !soundEnabledRef.current;
    return soundEnabledRef.current;
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    soundEnabledRef.current = value;
    return soundEnabledRef.current;
  }, []);

  return { play, toggle, setEnabled, isEnabled: () => soundEnabledRef.current };
}
