import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useSound } from '@/hooks/useSound';
import { type DesktopIcon, loadIconPositions, saveIconPositions } from '@/hooks/useDesktopIcons';
import { DefaultFileIcon } from './DefaultFileIcon';
import { CogContextMenu } from './CogContextMenu';
import { useContextMenu } from '@/hooks/useContextMenu';

interface Props {
  icons: DesktopIcon[];
  iconImages: Record<string, string | null>;
  onResolveImage: (path: string, dataUrl: string | null) => void;
  onOpenFolder?: (path: string) => void;
  scale?: number;
  onDesktopContextMenu?: (e: React.MouseEvent) => void;
}

const BASE_CELL_W = 88;
const BASE_CELL_H = 92;
const PADDING = 24;
const BOTTOM_RESERVED = 56;

/**
 * DesktopIconsLayer — fullscreen desktop icons grid with persistent positions, scale & multi-select.
 */
export const DesktopIconsLayer = memo(function DesktopIconsLayer({
  icons,
  iconImages,
  onResolveImage,
  onOpenFolder,
  scale = 1,
  onDesktopContextMenu,
}: Props) {
  const { exec, systemInfo, getFileIcon, resolveShortcut } = useSystemBridge();
  const { play, playHover } = useSound();
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => loadIconPositions());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const shortcutCacheRef = useRef<Record<string, string | null>>({});
  const inflightRef = useRef<Set<string>>(new Set());
  const layerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ctx = useContextMenu();

  const CELL_W = Math.round(BASE_CELL_W * scale);
  const CELL_H = Math.round(BASE_CELL_H * scale);
  const ICON_SIZE = Math.round(40 * scale);
  const FONT_SIZE = Math.max(9, Math.round(10 * scale));

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
  }, [icons, positions, CELL_W, CELL_H]);

  // Resolve icon images
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
    if (e.button !== 0) return;
    e.preventDefault();
    setSelectedIds(prev => {
      if (e.ctrlKey || e.metaKey) {
        const next = new Set(prev);
        if (next.has(icon.id)) next.delete(icon.id); else next.add(icon.id);
        return next;
      }
      return new Set([icon.id]);
    });
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
  }, [layout, CELL_W, CELL_H]);

  // Marquee selection on background
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    let active = false;
    let startX = 0, startY = 0;
    let marquee: HTMLDivElement | null = null;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.target !== layer) return;
      active = true;
      startX = e.clientX; startY = e.clientY;
      setSelectedIds(new Set());
      marquee = document.createElement('div');
      marquee.style.cssText =
        'position:fixed;border:1px solid hsl(187 90% 60% / 0.7);background:hsl(187 90% 50% / 0.12);pointer-events:none;z-index:9999;';
      document.body.appendChild(marquee);
    };
    const onMove = (e: MouseEvent) => {
      if (!active || !marquee) return;
      const x = Math.min(startX, e.clientX), y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
      marquee.style.left = `${x}px`;
      marquee.style.top = `${y}px`;
      marquee.style.width = `${w}px`;
      marquee.style.height = `${h}px`;
      const newSel = new Set<string>();
      iconRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        if (r.right >= x && r.left <= x + w && r.bottom >= y && r.top <= y + h) {
          newSel.add(id);
        }
      });
      setSelectedIds(newSel);
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      if (marquee) { marquee.remove(); marquee = null; }
    };
    layer.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      layer.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleIconContextMenu = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(new Set([icon.id]));
    ctx.openMenu(e, [
      { label: 'Ouvrir', icon: '▸', onClick: () => handleOpen(icon) },
      { label: 'Copier le chemin', icon: '⧉', onClick: () => navigator.clipboard?.writeText(icon.path) },
      { separator: true, label: '', onClick: () => {} },
      { label: 'Renommer', icon: '✎', onClick: () => {/* future */} },
      { label: 'Supprimer', icon: '✕', danger: true, onClick: () => {/* future */} },
    ]);
  }, [ctx, handleOpen]);

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    if (e.target !== layerRef.current) return;
    onDesktopContextMenu?.(e);
  }, [onDesktopContextMenu]);

  return (
    <>
      <div
        ref={layerRef}
        className="fixed inset-0 z-10"
        onClick={(e) => { if (e.target === layerRef.current) setSelectedIds(new Set()); }}
        onContextMenu={handleBackgroundContextMenu}
        style={{ pointerEvents: 'auto' }}
      >
        {icons.map(icon => {
          const pos = layout[icon.path] ?? { x: PADDING, y: PADDING };
          const img = iconImages[icon.path];
          const selected = selectedIds.has(icon.id);
          return (
            <motion.div
              key={icon.path}
              ref={(el) => { if (el) iconRefs.current.set(icon.id, el); else iconRefs.current.delete(icon.id); }}
              className="absolute select-none"
              style={{ left: pos.x, top: pos.y, width: CELL_W, pointerEvents: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => handleDragStart(e, icon)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(icon.id)) next.delete(icon.id); else next.add(icon.id);
                    return next;
                  });
                } else {
                  setSelectedIds(new Set([icon.id]));
                }
              }}
              onDoubleClick={() => handleOpen(icon)}
              onContextMenu={(e) => handleIconContextMenu(e, icon)}
            >
              <div className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded transition-colors',
                selected ? 'bg-intent-primary/20 ring-1 ring-intent-primary/40' : 'hover:bg-white/5',
              )}>
                <div className="flex items-center justify-center" style={{ width: ICON_SIZE, height: ICON_SIZE }}>
                  {img ? (
                    <img src={img} alt={icon.name} className="max-w-full max-h-full object-contain" draggable={false} />
                  ) : (
                    <DefaultFileIcon name={icon.name} isDirectory={icon.isDirectory} size={ICON_SIZE - 2} />
                  )}
                </div>
                <span
                  className="text-center text-text-primary leading-tight max-w-full break-words line-clamp-2"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)', fontSize: FONT_SIZE }}
                >
                  {icon.name.replace(/\.(lnk|url|exe|appref-ms)$/i, '')}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <CogContextMenu open={ctx.menu.open} x={ctx.menu.x} y={ctx.menu.y} items={ctx.menu.items} onClose={ctx.close} />
    </>
  );
});
