import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import React from 'react';

const SETTINGS_KEY = 'desktop:settings:v2';
const SETTINGS_VERSION = 2;

export interface DesktopSettings {
  version: number;
  // Appearance
  wallpaperPreset: 'cyan-void' | 'purple-haze' | 'green-matrix' | 'monochrome' | 'custom';
  wallpaperCustomUrl: string;
  surfaceOpacity: number;
  accentColor: string; // HSL string
  fontFamily: 'default' | 'mono' | 'sans';
  // Behavior
  iconScale: number;
  snapGrid: boolean;
  animationsEnabled: boolean;
  reduceMotion: boolean;
  // Audio
  soundsEnabled: boolean;
  ttsEnabled: boolean;
  voiceInputEnabled: boolean;
  // System
  explorerTakeoverEnabled: boolean;
  autoFullscreen: boolean;
  // Cognitive
  autonomyLevel: 'manual' | 'assisted' | 'autonomous';
}

const DEFAULT_SETTINGS: DesktopSettings = {
  version: SETTINGS_VERSION,
  wallpaperPreset: 'cyan-void',
  wallpaperCustomUrl: '',
  surfaceOpacity: 0.85,
  accentColor: '187 85% 53%',
  fontFamily: 'default',
  iconScale: 1,
  snapGrid: true,
  animationsEnabled: true,
  reduceMotion: false,
  soundsEnabled: true,
  ttsEnabled: false,
  voiceInputEnabled: false,
  explorerTakeoverEnabled: true,
  autoFullscreen: true,
  autonomyLevel: 'assisted',
};

function migrate(raw: any): DesktopSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const v = raw.version ?? 1;
  const merged = { ...DEFAULT_SETTINGS, ...raw, version: SETTINGS_VERSION };
  // Future migrations go here based on `v`
  if (v < 2) {
    // v1 -> v2: add new fields with defaults
  }
  return merged;
}

function load(): DesktopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return migrate(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function save(settings: DesktopSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

interface SettingsContextType {
  settings: DesktopSettings;
  update: <K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => void;
  updateMany: (partial: Partial<DesktopSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DesktopSettings>(() => load());

  useEffect(() => {
    save(settings);
  }, [settings]);

  // Broadcast changes to other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY && e.newValue) {
        try {
          setSettings(migrate(JSON.parse(e.newValue)));
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const update = useCallback(<K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMany = useCallback((partial: Partial<DesktopSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return React.createElement(SettingsContext.Provider, {
    value: { settings, update, updateMany, reset },
    children,
  });
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// Wallpaper backgrounds by preset
export const WALLPAPER_BACKGROUNDS: Record<string, string> = {
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

export function getWallpaperBackground(settings: DesktopSettings): string {
  if (settings.wallpaperPreset === 'custom' && settings.wallpaperCustomUrl) {
    return `url("${settings.wallpaperCustomUrl}") center/cover no-repeat, hsl(220 20% 4%)`;
  }
  return WALLPAPER_BACKGROUNDS[settings.wallpaperPreset] ?? WALLPAPER_BACKGROUNDS['cyan-void'];
}
