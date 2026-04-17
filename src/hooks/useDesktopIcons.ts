import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSystemBridge } from '@/hooks/useSystemBridge';

export interface DesktopIcon {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: Date | null;
}

const WINDOWS_PUBLIC_DESKTOP = 'C:\\Users\\Public\\Desktop';
const CACHE_KEY = 'desktop:icons:cache:v1';
const POS_KEY = 'desktop:icons:positions:v1';

const buildDesktopCandidates = (home: string, platform?: string) => {
  const normalized = home.replace(/\\/g, '/');
  const candidates = [
    `${normalized}/Desktop`,
    `${normalized}/OneDrive/Desktop`,
    `${normalized}/OneDrive - Personal/Desktop`,
  ];
  if (platform === 'win32') {
    candidates.push(WINDOWS_PUBLIC_DESKTOP);
  }
  return candidates;
};

const ALLOWED_EXTENSIONS = new Set(['.lnk', '.exe', '.url', '.appref-ms']);

const isAllowedIcon = (item: DesktopIcon) => {
  if (item.isDirectory) return true;
  if (!item.isFile) return false;
  const lower = item.name.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = lower.slice(dotIndex);
  return ALLOWED_EXTENSIONS.has(ext);
};

interface CacheShape {
  icons: Array<Omit<DesktopIcon, 'modified'> & { modified: number | null }>;
  iconImages: Record<string, string | null>;
  savedAt: number;
}

function loadCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheShape;
  } catch { return null; }
}

function saveCache(cache: CacheShape) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export function loadIconPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveIconPositions(positions: Record<string, { x: number; y: number }>) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch {}
}

function iconsEqual(a: DesktopIcon[], b: DesktopIcon[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].path !== b[i].path || a[i].name !== b[i].name) return false;
  }
  return true;
}

export function useDesktopIcons(enabled = true) {
  const { isAvailable, systemInfo, listDir } = useSystemBridge();

  // Hydrate immediately from cache for instant first paint
  const initialCache = useMemo(() => loadCache(), []);
  const [icons, setIcons] = useState<DesktopIcon[]>(() => {
    if (!initialCache) return [];
    return initialCache.icons.map(i => ({
      ...i,
      modified: i.modified ? new Date(i.modified) : null,
    }));
  });
  const [iconImages, setIconImages] = useState<Record<string, string | null>>(() => initialCache?.iconImages ?? {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iconsRef = useRef(icons);
  iconsRef.current = icons;

  const candidates = useMemo(() => {
    if (!systemInfo?.homedir) return [];
    return buildDesktopCandidates(systemInfo.homedir, systemInfo.platform);
  }, [systemInfo?.homedir, systemInfo?.platform]);

  const refresh = useCallback(async () => {
    if (!enabled || !isAvailable || candidates.length === 0) return;
    setIsLoading(true);
    setError(null);

    const collected: DesktopIcon[] = [];
    const sources: string[] = [];

    for (const candidate of candidates) {
      const normalized = candidate.replace(/\//g, '\\');
      const result = await listDir(normalized, { showHidden: false });
      if (result.success && result.items) {
        sources.push(normalized);
        collected.push(
          ...result.items.map(item => ({
            id: item.path,
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            isFile: item.isFile,
            size: item.size,
            modified: item.modified ? new Date(item.modified) : null,
          })),
        );
      }
    }

    if (sources.length === 0) {
      setError('Bureau introuvable');
      setIsLoading(false);
      return;
    }

    const filtered = collected.filter(isAllowedIcon);
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr-FR'));

    if (!iconsEqual(filtered, iconsRef.current)) {
      setIcons(filtered);
      saveCache({
        icons: filtered.map(i => ({ ...i, modified: i.modified?.getTime() ?? null })),
        iconImages,
        savedAt: Date.now(),
      });
    }
    setIsLoading(false);
  }, [enabled, isAvailable, candidates, listDir, iconImages]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  const setIconImage = useCallback((path: string, dataUrl: string | null) => {
    setIconImages(prev => {
      if (prev[path] === dataUrl) return prev;
      const next = { ...prev, [path]: dataUrl };
      const cache = loadCache();
      if (cache) saveCache({ ...cache, iconImages: next });
      return next;
    });
  }, []);

  return {
    icons,
    iconImages,
    setIconImage,
    isLoading,
    error,
    refresh,
    isAvailable,
  };
}
