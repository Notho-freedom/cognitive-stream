import { useEffect, useMemo, useState } from 'react';
import type { FileEntity } from '@/types/explorer.types';
import { useSystemBridge } from '@/hooks/useSystemBridge';

const iconCache = new Map<string, string>();

function getEntityIconRequest(entity: FileEntity) {
  if (!entity.iconPath) return null;
  return {
    key: entity.iconKey || entity.id,
    path: entity.iconPath,
    extension: entity.extension,
    isDirectory: entity.type === 'directory' || entity.kind === 'drive',
  };
}

export function useExplorerIcons(entities: FileEntity[]) {
  const { isAvailable, getFileIcons } = useSystemBridge();
  const [icons, setIcons] = useState<Record<string, string>>({});

  const requests = useMemo(() => {
    const next = entities
      .map(getEntityIconRequest)
      .filter(Boolean) as Array<{ key: string; path: string; extension?: string; isDirectory?: boolean }>;

    return next.filter((entry) => !iconCache.has(entry.key));
  }, [entities]);

  useEffect(() => {
    const snapshot: Record<string, string> = {};
    for (const entity of entities) {
      const key = entity.iconKey || entity.id;
      const cached = iconCache.get(key);
      if (cached) snapshot[key] = cached;
    }
    setIcons(snapshot);
  }, [entities]);

  useEffect(() => {
    if (!isAvailable || requests.length === 0) return;
    let cancelled = false;

    void getFileIcons(requests).then((result) => {
      if (cancelled || !result.success) return;

      const next: Record<string, string> = {};
      for (const icon of result.icons) {
        if (!icon.success || !icon.dataUrl) continue;
        iconCache.set(icon.key, icon.dataUrl);
        next[icon.key] = icon.dataUrl;
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setIcons((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getFileIcons, isAvailable, requests]);

  return icons;
}
