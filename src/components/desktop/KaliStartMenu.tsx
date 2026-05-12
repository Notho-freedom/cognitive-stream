import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Power, Settings as SettingsIcon, FolderOpen, TerminalSquare, FlaskConical, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KaliMenuAction {
  id: string;
  label: string;
  description?: string;
  category: 'favorites' | 'system' | 'tools' | 'settings';
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  open: boolean;
  anchor: { x: number; y: number };
  actions: KaliMenuAction[];
  onClose: () => void;
}

const CATEGORY_LABELS: Record<KaliMenuAction['category'], string> = {
  favorites: 'Favoris',
  tools: 'Outils',
  system: 'Système',
  settings: 'Paramètres',
};

/** XFCE/Kali-style vertical applications menu. */
export function KaliStartMenu({ open, anchor, actions, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<KaliMenuAction['category']>('favorites');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveCat('favorites');
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);

  const categories = useMemo(() => {
    const cats: KaliMenuAction['category'][] = [];
    actions.forEach(a => { if (!cats.includes(a.category)) cats.push(a.category); });
    return cats;
  }, [actions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return actions.filter(a => a.label.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    return actions.filter(a => a.category === activeCat);
  }, [actions, query, activeCat]);

  // Clamp panel inside viewport
  const PANEL_W = 480;
  const PANEL_H = 460;
  const left = typeof window !== 'undefined' ? Math.min(anchor.x, window.innerWidth - PANEL_W - 8) : anchor.x;
  const top = anchor.y;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="fixed z-[9000] pointer-events-auto"
          style={{ left, top, width: PANEL_W, height: PANEL_H }}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="flex h-full rounded-md overflow-hidden border border-border/50"
            style={{
              background: 'hsl(220 24% 5% / 0.97)',
              backdropFilter: 'blur(24px) saturate(1.3)',
              boxShadow: '0 24px 60px hsl(0 0% 0% / 0.6)',
            }}
          >
            {/* Categories sidebar */}
            <div
              className="w-[140px] flex flex-col border-r border-border/30 py-2"
              style={{ background: 'hsl(220 24% 3.5%)' }}
            >
              <div className="px-3 pt-1 pb-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">Cognitive OS</div>
                <div className="text-[11px] font-light text-foreground/90 mt-0.5">Applications</div>
              </div>
              <div className="border-t border-border/30 my-1" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCat(cat); setQuery(''); }}
                  className={cn(
                    'flex items-center px-3 h-7 text-[11px] font-light transition-colors text-left',
                    !query && activeCat === cat
                      ? 'bg-primary/15 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-[hsl(var(--explorer-hover))] hover:text-foreground border-l-2 border-transparent',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
              <div className="flex-1" />
              <div className="border-t border-border/30 mb-1" />
              <button
                onClick={() => { onClose(); (window as any).electron?.app?.quit?.(); }}
                className="flex items-center gap-2 mx-2 px-2 h-7 text-[11px] font-light text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                <Power size={12} />
                Quitter
              </button>
            </div>

            {/* Right pane */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-2 border-b border-border/30">
                <div className="flex items-center gap-2 px-2 h-7 rounded bg-[hsl(220_24%_3%)] border border-border/40">
                  <Search size={12} className="text-muted-foreground/60" />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher une application..."
                    className="flex-1 bg-transparent text-[11px] font-light text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[11px] text-muted-foreground/50 font-light">
                    Aucun résultat
                  </div>
                ) : filtered.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { a.onClick(); onClose(); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 h-9 text-left transition-colors',
                      'hover:bg-[hsl(var(--explorer-hover))]',
                      a.danger && 'hover:bg-red-500/10',
                    )}
                  >
                    <div className={cn(
                      'h-6 w-6 flex items-center justify-center rounded shrink-0',
                      a.danger ? 'text-red-400 bg-red-500/10' : 'text-primary/80 bg-primary/10',
                    )}>
                      {a.icon ?? <FolderOpen size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[12px] font-light truncate', a.danger ? 'text-red-300' : 'text-foreground/90')}>
                        {a.label}
                      </div>
                      {a.description && (
                        <div className="text-[10px] text-muted-foreground/60 truncate">{a.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Convenience icons re-export for callers
export const KaliMenuIcons = {
  Folder: <FolderOpen size={13} />,
  Terminal: <TerminalSquare size={13} />,
  Settings: <SettingsIcon size={13} />,
  Tests: <FlaskConical size={13} />,
  Logout: <LogOut size={13} />,
};
