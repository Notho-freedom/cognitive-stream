import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { type DesktopIcon, loadIconPositions, saveIconPositions } from '@/hooks/useDesktopIcons';

interface Props {
  icons: DesktopIcon[];
  iconImages: Record<string, string | null>;
  onResolveImage: (path: string, dataUrl: string | null) => void;
  onOpenFolder?: (path: string) => void;
}

const CELL_W = 88;
const CELL_H = 92;
const PADDING = 24;
const BOTTOM_RESERVED = 56; // taskbar height

/**
 * DesktopIconsLayer — fullscreen desktop icons grid with persistent positions
 */
export const DesktopIconsLayer = memo(function DesktopIconsLayer({
  icons,
  iconImages,
  onResolveImage,
  onOpenFolder,
}: Props) {
  const { exec, systemInfo, getFileIcon, resolveShortcut } = useSystemBridge();
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => loadIconPositions());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const shortcutCacheRef = useRef<Record<string, string | null>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  // Auto-layout for icons without saved positions
  const layout = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = { ...positions };
    if (typeof window === 'undefined') return result;
    const maxRows = Math.max(1, Math.floor((window.innerHeight - PADDING - BOTTOM_RESERVED) / CELL_H));
    let cursor = 0;
    icons.forEach(icon => {
      if (result[icon.path]) return;
      const col = Math.floor(cursor / maxRows);
      const row = cursor % maxRows;
      result[icon.path] = {
        x: PADDING + col * CELL_W,
        y: PADDING + row * CELL_H,
      };
      cursor++;
    });
    return result;
  }, [icons, positions]);

  // Resolve icon images (only ones not in cache)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (const icon of icons) {
        if (iconImages[icon.path] !== undefined) continue;
        if (inflightRef.current.has(icon.path)) continue;
        inflightRef.current.add(icon.path);
        try {
          let sourcePath = icon.path;
          const lower = icon.name.toLowerCase();
          if (lower.endsWith('.lnk') && systemInfo?.platform === 'win32') {
            if (shortcutCacheRef.current[icon.path] === undefined) {
              const r = await resolveShortcut(icon.path);
              shortcutCacheRef.current[icon.path] = r.success && r.targetPath ? r.targetPath : null;
            }
            sourcePath = shortcutCacheRef.current[icon.path] ?? icon.path;
          }
          const result = await getFileIcon(sourcePath);
          if (cancelled) return;
          onResolveImage(icon.path, result.success ? result.dataUrl ?? null : null);
        } catch {
          if (!cancelled) onResolveImage(icon.path, null);
        } finally {
          inflightRef.current.delete(icon.path);
        }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [icons, iconImages, getFileIcon, resolveShortcut, systemInfo?.platform, onResolveImage]);

  const handleOpen = useCallback(async (icon: DesktopIcon) => {
    if (icon.isDirectory && onOpenFolder) {
      onOpenFolder(icon.path);
      return;
    }
    const platform = systemInfo?.platform;
    if (platform === 'win32') await exec(`Start-Process -FilePath "${icon.path}"`);
    else if (platform === 'darwin') await exec(`open "${icon.path}"`);
    else await exec(`xdg-open "${icon.path}"`);
  }, [exec, systemInfo?.platform, onOpenFolder]);

  const handleDragStart = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    e.preventDefault();
    setSelectedId(icon.id);
    const pos = layout[icon.path] ?? { x: PADDING, y: PADDING };
    dragRef.current = {
      id: icon.path,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const x = Math.max(0, ev.clientX - dragRef.current.offsetX);
      const y = Math.max(0, ev.clientY - dragRef.current.offsetY);
      setPositions(prev => ({ ...prev, [dragRef.current!.id]: { x, y } }));
    };
    const handleUp = () => {
      if (dragRef.current) {
        // Snap to grid
        setPositions(prev => {
          const id = dragRef.current!.id;
          const p = prev[id];
          if (!p) return prev;
          const snapped = {
            x: Math.round(p.x / CELL_W) * CELL_W,
            y: Math.round(p.y / CELL_H) * CELL_H,
          };
          const next = { ...prev, [id]: snapped };
          saveIconPositions(next);
          return next;
        });
      }
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [layout]);

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none"
      onClick={() => setSelectedId(null)}
    >
      {icons.map(icon => {
        const pos = layout[icon.path] ?? { x: PADDING, y: PADDING };
        const img = iconImages[icon.path];
        const selected = selectedId === icon.id;
        return (
          <motion.div
            key={icon.path}
            className="absolute pointer-events-auto select-none"
            style={{ left: pos.x, top: pos.y, width: CELL_W }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => handleDragStart(e, icon)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(icon.id); }}
            onDoubleClick={() => handleOpen(icon)}
          >
            <div className={cn(
              'flex flex-col items-center gap-1 px-2 py-1.5 rounded transition-colors',
              selected ? 'bg-intent-primary/20 ring-1 ring-intent-primary/40' : 'hover:bg-white/5',
            )}>
              <div className="w-10 h-10 flex items-center justify-center">
                {img ? (
                  <img src={img} alt={icon.name} className="max-w-full max-h-full object-contain" draggable={false} />
                ) : (
                  <div className={cn(
                    'w-9 h-9 rounded-sm border',
                    icon.isDirectory ? 'border-intent-primary/40 bg-intent-primary/10' : 'border-intent-secondary/40 bg-intent-secondary/10',
                  )} />
                )}
              </div>
              <span
                className="text-[10px] text-center text-text-primary leading-tight max-w-full break-words line-clamp-2"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
              >
                {icon.name.replace(/\.(lnk|url|exe|appref-ms)$/i, '')}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
