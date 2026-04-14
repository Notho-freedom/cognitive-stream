import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useDesktopIcons(enabled = true) {
  const { isAvailable, systemInfo, listDir } = useSystemBridge();
  const [icons, setIcons] = useState<DesktopIcon[]>([]);
  const [desktopPath, setDesktopPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!systemInfo?.homedir) return [];
    return buildDesktopCandidates(systemInfo.homedir, systemInfo.platform);
  }, [systemInfo?.homedir, systemInfo?.platform]);

  const loadIcons = useCallback(async () => {
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
          }))
        );
      }
    }

    if (sources.length === 0) {
      setIcons([]);
      setDesktopPath(null);
      setError('Bureau introuvable');
      setIsLoading(false);
      return;
    }

    const filtered = collected.filter(isAllowedIcon);
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr-FR'));
    setIcons(filtered);
    setDesktopPath(sources.join(' | '));
    setIsLoading(false);
  }, [enabled, isAvailable, candidates, listDir]);

  useEffect(() => {
    if (!enabled) {
      setIcons([]);
      setDesktopPath(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    void loadIcons();
  }, [enabled, loadIcons]);

  return {
    icons,
    desktopPath,
    isLoading,
    error,
    refresh: loadIcons,
    isAvailable,
  };
}
