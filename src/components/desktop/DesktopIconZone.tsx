import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import type { DesktopIcon } from '@/hooks/useDesktopIcons';

interface DesktopIconZoneProps {
  icons: DesktopIcon[];
  isLoading: boolean;
  error: string | null;
  surfaceOpacity: number;
  onMouseStateChange?: (inside: boolean) => void;
  onOpenExplorer?: (path: string) => void;
}

type IconPosition = { x: number; y: number };

const ICON_SIZE = 56;
const CELL_GAP = 8;
const PADDING = 14;
const COLUMN_WIDTH = 96;
const ROW_HEIGHT = ICON_SIZE + 26;
const FRAME_OVERHEAD = 56;

export function DesktopIconZone({
  icons,
  isLoading,
  error,
  surfaceOpacity,
  onMouseStateChange,
  onOpenExplorer,
}: DesktopIconZoneProps) {
  const { exec, systemInfo, getFileIcon, resolveShortcut } = useSystemBridge();
  const [iconCache, setIconCache] = useState<Record<string, string | null>>({});
  const iconCacheRef = useRef<Record<string, string | null>>({});
  const shortcutCacheRef = useRef<Record<string, string | null>>({});
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const sortedIcons = useMemo(() => {
    return [...icons].sort((a, b) => a.name.localeCompare(b.name, 'fr-FR'));
  }, [icons]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const zoneSize = useMemo(() => {
    const maxHeight = viewport.height > 0 ? viewport.height : 640;
    const contentHeight = Math.max(ROW_HEIGHT, maxHeight - FRAME_OVERHEAD);
    const usableHeight = Math.max(ROW_HEIGHT, contentHeight - PADDING * 2);
    const rows = Math.max(1, Math.floor(usableHeight / ROW_HEIGHT));
    const columns = Math.max(1, Math.ceil(sortedIcons.length / rows));
    const width = PADDING * 2 + columns * COLUMN_WIDTH + (columns - 1) * CELL_GAP;
    return {
      width,
      height: contentHeight,
      rows,
      columns,
    };
  }, [sortedIcons.length, viewport.height]);

  const layout = useMemo(() => {
    const next: Record<string, IconPosition> = {};
    sortedIcons.forEach((icon, index) => {
      const columnIndex = Math.floor(index / zoneSize.rows);
      const rowIndex = index % zoneSize.rows;
      const x = PADDING + columnIndex * (COLUMN_WIDTH + CELL_GAP);
      const y = PADDING + rowIndex * ROW_HEIGHT;
      next[icon.path] = { x, y };
    });
    return next;
  }, [sortedIcons, zoneSize.rows]);

  const resolveIconPath = useCallback(async (icon: DesktopIcon) => {
    const lower = icon.name.toLowerCase();
    if (lower.endsWith('.lnk') && systemInfo?.platform === 'win32') {
      if (shortcutCacheRef.current[icon.path] !== undefined) {
        return shortcutCacheRef.current[icon.path] || icon.path;
      }
      const result = await resolveShortcut(icon.path);
      const target = result.success && result.targetPath ? result.targetPath : null;
      shortcutCacheRef.current[icon.path] = target;
      return target || icon.path;
    }
    return icon.path;
  }, [resolveShortcut, systemInfo?.platform]);

  useEffect(() => {
    let cancelled = false;

    const loadIcons = async () => {
      for (const icon of sortedIcons) {
        if (iconCacheRef.current[icon.path] !== undefined) continue;
        iconCacheRef.current[icon.path] = null;
        try {
          const sourcePath = await resolveIconPath(icon);
          const result = await getFileIcon(sourcePath);
          if (cancelled) return;
          const dataUrl = result.success ? result.dataUrl || null : null;
          iconCacheRef.current[icon.path] = dataUrl;
          setIconCache(prev => ({ ...prev, [icon.path]: dataUrl }));
        } catch {
          if (cancelled) return;
        }
      }
    };

    if (sortedIcons.length > 0) {
      void loadIcons();
    }

    return () => {
      cancelled = true;
    };
  }, [sortedIcons, getFileIcon, resolveIconPath]);

  const handleOpen = useCallback(async (icon: DesktopIcon) => {
    // If it's a directory, open in our explorer
    if (icon.isDirectory && onOpenExplorer) {
      onOpenExplorer(icon.path);
      return;
    }
    if (!systemInfo?.platform) return;
    if (systemInfo.platform === 'win32') {
      await exec(`Start-Process -FilePath "${icon.path}"`);
      return;
    }
    if (systemInfo.platform === 'darwin') {
      await exec(`open "${icon.path}"`);
      return;
    }
    await exec(`xdg-open "${icon.path}"`);
  }, [exec, systemInfo?.platform, onOpenExplorer]);

  return (
    <div
      className="fixed left-4 top-0 z-30 pointer-events-auto"
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
      <FuturisticFrame variant="minimal" animated={false} surfaceOpacity={surfaceOpacity} gridOpacity={0.02}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-[0.3em] text-text-ghost">DESKTOP</span>
            {isLoading && <span className="text-[8px] text-text-ghost/60">SYNC</span>}
          </div>

          <div
            className="relative"
            style={{ width: zoneSize.width, height: zoneSize.height, maxHeight: zoneSize.height }}
          >
            {error && (
              <div className="text-[10px] text-text-ghost/70">
                {error}
              </div>
            )}

            {sortedIcons.map(icon => {
              const position = layout[icon.path] || { x: PADDING, y: PADDING };
              const iconUrl = iconCache[icon.path];
              return (
                <motion.div
                  key={icon.path}
                  className="absolute select-none"
                  style={{ left: position.x, top: position.y }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    className={cn(
                      'flex flex-col items-center gap-1 text-[10px] text-text-ghost/80 hover:text-text-primary transition-colors w-[96px]'
                    )}
                    onDoubleClick={() => handleOpen(icon)}
                  >
                    <div className="w-12 h-12 rounded-md border border-white/10 bg-surface-deep/60 flex items-center justify-center">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={icon.name}
                          className="w-10 h-10 object-contain"
                          draggable={false}
                        />
                      ) : (
                        <IconGlyph isDirectory={icon.isDirectory} />
                      )}
                    </div>
                    <span className="max-w-[90px] truncate">{icon.name}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </FuturisticFrame>
    </div>
  );
}

function IconGlyph({ isDirectory }: { isDirectory: boolean }) {
  return isDirectory ? (
    <div className="w-12 h-10 rounded-md border border-intent-primary/30 bg-intent-primary/10 flex items-center justify-center">
      <div className="w-6 h-4 bg-intent-primary/40 rounded-sm" />
    </div>
  ) : (
    <div className="w-10 h-12 rounded-sm border border-intent-secondary/30 bg-intent-secondary/10 flex items-center justify-center">
      <div className="w-5 h-6 border border-intent-secondary/40" />
    </div>
  );
}
