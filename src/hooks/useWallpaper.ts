import { useCallback, useEffect, useState } from 'react';

const KEY = 'desktop:wallpaper:v1';

export type WallpaperPreset = 'cyan-void' | 'purple-haze' | 'green-matrix' | 'monochrome';

export interface WallpaperState {
  preset: WallpaperPreset | 'custom';
  customUrl?: string;
}

const PRESET_BG: Record<WallpaperPreset, string> = {
  'cyan-void': `
    radial-gradient(ellipse 80% 50% at 50% -20%, hsl(187 85% 53% / 0.10), transparent),
    radial-gradient(ellipse 60% 40% at 80% 100%, hsl(270 80% 65% / 0.06), transparent),
    hsl(220 20% 4%)
  `,
  'purple-haze': `
    radial-gradient(ellipse 70% 50% at 30% 0%, hsl(280 75% 55% / 0.18), transparent),
    radial-gradient(ellipse 60% 50% at 80% 100%, hsl(320 70% 55% / 0.12), transparent),
    hsl(260 25% 5%)
  `,
  'green-matrix': `
    radial-gradient(ellipse 80% 50% at 50% 0%, hsl(155 80% 45% / 0.14), transparent),
    radial-gradient(ellipse 50% 30% at 50% 100%, hsl(180 70% 40% / 0.08), transparent),
    hsl(150 25% 4%)
  `,
  'monochrome': `
    radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 12% 14% / 0.6), transparent),
    hsl(220 10% 5%)
  `,
};

function load(): WallpaperState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { preset: 'cyan-void' };
}

export function useWallpaper() {
  const [state, setState] = useState<WallpaperState>(() => load());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const setPreset = useCallback((preset: WallpaperPreset) => setState({ preset }), []);
  const setCustomUrl = useCallback((url: string) => setState({ preset: 'custom', customUrl: url }), []);

  const background =
    state.preset === 'custom' && state.customUrl
      ? `url("${state.customUrl}") center/cover no-repeat, hsl(220 20% 4%)`
      : PRESET_BG[(state.preset as WallpaperPreset) ?? 'cyan-void'];

  return { state, setPreset, setCustomUrl, background, PRESET_BG };
}
