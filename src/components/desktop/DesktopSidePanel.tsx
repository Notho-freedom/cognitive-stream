import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { useSettings } from '@/hooks/useSettings';

interface DesktopSidePanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeCardCount: number;
  onDismissAllCards: () => void;
}

const PANEL_WIDTH = 340;

/** Activity panel — Quick toggles + notification history. Reads settings from useSettings. */
export function DesktopSidePanel({
  isCollapsed, onToggleCollapse,
  activeCardCount, onDismissAllCards,
}: DesktopSidePanelProps) {
  const { settings, update, updateMany } = useSettings();
  const { history = [] } = useNotifications() as any;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-auto" style={{ marginBottom: 22 }}>
      <AnimatePresence mode="popLayout">
        {isCollapsed ? (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center gap-2 px-3 py-4 text-[9px] uppercase tracking-[0.2em] text-text-ghost/70 border border-intent-primary/30"
            style={{
              background: `hsl(220 22% 8% / ${Math.min(0.95, Math.max(0.5, settings.surfaceOpacity))})`,
              clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
            }}
            onClick={onToggleCollapse}
          >
            <span>≡</span>
            <span>ACT</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            style={{ width: PANEL_WIDTH }}
          >
            <FuturisticFrame variant="primary" animated={!settings.reduceMotion} surfaceOpacity={1.0} gridOpacity={0.025}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-intent-primary">
                    ◇ Activité
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/settings"
                      className="text-[9px] uppercase tracking-wider text-text-ghost hover:text-intent-primary transition-colors"
                      title="Paramètres"
                    >
                      ⚙ Paramètres
                    </Link>
                    <button onClick={onToggleCollapse} className="text-[10px] text-text-ghost/60 hover:text-text-primary">✕</button>
                  </div>
                </div>

                <ScrollArea className="max-h-[68vh] pr-2">
                  {/* Quick toggles — read from settings */}
                  <Section title="Quick">
                    <ToggleRow label="Sortie vocale" checked={settings.ttsEnabled} onChange={v => update('ttsEnabled', v)} />
                    <ToggleRow label="Entrée vocale" checked={settings.voiceInputEnabled} onChange={v => update('voiceInputEnabled', v)} />
                    <ToggleRow label="Sons UI" checked={settings.soundsEnabled} onChange={v => update('soundsEnabled', v)} />
                    <ToggleRow label="Mode réduit" checked={settings.reduceMotion} onChange={v => update('reduceMotion', v)} />
                    <ToggleRow label="Explorateur takeover" checked={settings.explorerTakeoverEnabled} onChange={v => update('explorerTakeoverEnabled', v)} />
                  </Section>

                  <Section title={`Cartes actives · ${activeCardCount}`}>
                    {activeCardCount === 0
                      ? <div className="text-[10px] text-text-ghost/40 px-1">Aucune carte ouverte</div>
                      : (
                        <button
                          onClick={onDismissAllCards}
                          className="w-full py-1.5 text-[10px] uppercase tracking-wider text-intent-warning border border-intent-warning/40 hover:bg-intent-warning/10"
                          style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
                        >
                          Tout fermer
                        </button>
                      )}
                  </Section>

                  <Section title="Performances">
                    <button
                      onClick={() => updateMany({ reduceMotion: true, soundsEnabled: false, animationsEnabled: false })}
                      className="w-full py-2 text-[10px] uppercase tracking-[0.2em] text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10"
                      style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
                    >
                      Réduire la charge
                    </button>
                  </Section>

                  <Section title={`Notifications · ${history.length}`}>
                    {history.length === 0
                      ? <div className="text-[10px] text-text-ghost/40 px-1">Aucune notification</div>
                      : (
                        <div className="space-y-1 max-h-[180px] overflow-y-auto">
                          {history.slice(0, 20).map((n: any) => (
                            <div key={n.id} className="flex items-start gap-2 px-2 py-1 border-l border-intent-primary/20">
                              <span className={cn(
                                'mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0',
                                n.priority === 'critical' ? 'bg-intent-warning' :
                                n.priority === 'high' ? 'bg-intent-primary' :
                                'bg-text-ghost/50',
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-text-secondary leading-snug truncate">{n.message}</div>
                                <div className="text-[8px] text-text-ghost/40 uppercase tracking-wider">
                                  {new Date(n.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </Section>
                </ScrollArea>
              </div>
            </FuturisticFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-intent-primary/10 p-2 space-y-2 mb-2">
      <div className="text-[9px] uppercase tracking-[0.25em] text-text-ghost/70">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-text-ghost/80">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
