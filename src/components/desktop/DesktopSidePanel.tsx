import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type ExplorerTakeoverState = 'native' | 'armed' | 'restoring' | 'degraded';

interface DesktopSidePanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  surfaceOpacity: number;
  onSurfaceOpacityChange: (value: number) => void;
  ttsEnabled: boolean;
  onTtsToggle: (value: boolean) => void;
  voiceInputEnabled: boolean;
  voiceInputSupported: boolean;
  onVoiceInputToggle: (value: boolean) => void;
  soundsEnabled: boolean;
  onSoundsToggle: (value: boolean) => void;
  reduceMotion: boolean;
  onReduceMotionToggle: (value: boolean) => void;
  onActivatePerformanceMode: () => void;
  showDesktopApps: boolean;
  onShowDesktopAppsToggle: (value: boolean) => void;
  explorerTakeoverEnabled: boolean;
  onExplorerTakeoverEnabledChange: (value: boolean) => void;
  explorerTakeoverState: ExplorerTakeoverState;
}

const PANEL_WIDTH = 320;

export function DesktopSidePanel({
  isCollapsed,
  onToggleCollapse,
  surfaceOpacity,
  onSurfaceOpacityChange,
  ttsEnabled,
  onTtsToggle,
  voiceInputEnabled,
  voiceInputSupported,
  onVoiceInputToggle,
  soundsEnabled,
  onSoundsToggle,
  reduceMotion,
  onReduceMotionToggle,
  onActivatePerformanceMode,
  showDesktopApps,
  onShowDesktopAppsToggle,
  explorerTakeoverEnabled,
  onExplorerTakeoverEnabledChange,
  explorerTakeoverState,
}: DesktopSidePanelProps) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {isCollapsed ? (
          <motion.button
            key="panel-collapsed"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center gap-2 px-3 py-4 text-[9px] uppercase tracking-[0.2em] text-text-ghost/70 border border-intent-primary/30"
            style={{
              background: `hsl(220 22% 8% / ${Math.min(0.9, Math.max(0.4, surfaceOpacity))})`,
              clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
            }}
            onClick={onToggleCollapse}
          >
            <span>CFG</span>
            <span>▶</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel-expanded"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            style={{ width: PANEL_WIDTH }}
          >
            <FuturisticFrame variant="primary" animated={!reduceMotion} surfaceOpacity={surfaceOpacity} gridOpacity={0.025}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost">
                    CONFIGURATION
                  </span>
                  <button
                    onClick={onToggleCollapse}
                    className="text-[10px] text-text-ghost/60 hover:text-text-primary transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <ScrollArea className="max-h-[66vh] pr-2">
                  <div className="space-y-4">
                    <SettingRow label="Sortie vocale" description="Synthèse vocale du contenu"
                      checked={ttsEnabled} onChange={onTtsToggle} />
                    <SettingRow label="Entrée vocale"
                      description={voiceInputSupported ? 'Micro actif en continu' : 'Non supporté'}
                      checked={voiceInputEnabled} onChange={onVoiceInputToggle} disabled={!voiceInputSupported} />
                    <SettingRow label="Effets sonores" description="Sons UI contextuels"
                      checked={soundsEnabled} onChange={onSoundsToggle} />
                    <SettingRow label="Mode réduit" description="Animations minimales"
                      checked={reduceMotion} onChange={onReduceMotionToggle} />
                    <SettingRow label="Apps du bureau" description="Afficher le widget des applications"
                      checked={showDesktopApps} onChange={onShowDesktopAppsToggle} />
                    <SettingRow label="Explorateur Windows" description="Remplacer temporairement l'explorateur Windows"
                      checked={explorerTakeoverEnabled} onChange={onExplorerTakeoverEnabledChange} />

                    <div className="space-y-2 border border-intent-primary/10 p-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">État de sécurité</div>
                      <div className="flex items-center justify-between gap-3 text-[10px] text-text-ghost/70">
                        <span>
                          {explorerTakeoverEnabled
                            ? 'Takeover strict actif pendant la session.'
                            : 'Windows reste natif tant que le takeover est coupé.'}
                        </span>
                        <span className={cn(
                          'uppercase tracking-[0.18em]',
                          explorerTakeoverState === 'armed' ? 'text-intent-primary'
                            : explorerTakeoverState === 'restoring' ? 'text-intent-focus'
                            : explorerTakeoverState === 'degraded' ? 'text-intent-warning'
                            : 'text-text-ghost/55',
                        )}>
                          {formatTakeoverState(explorerTakeoverState)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                        <span>Transparence</span>
                        <span>{Math.round(surfaceOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[Math.round(surfaceOpacity * 100)]}
                        min={40} max={95} step={1}
                        onValueChange={(value) => {
                          onSurfaceOpacityChange(Math.min(0.95, Math.max(0.4, value[0] / 100)));
                        }}
                      />
                    </div>

                    <button
                      onClick={onActivatePerformanceMode}
                      className="w-full mt-2 py-2 text-[10px] uppercase tracking-[0.2em] text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10 transition-colors"
                      style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
                    >
                      Réduire la charge
                    </button>
                  </div>
                </ScrollArea>
              </div>
            </FuturisticFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingRow({ label, description, checked, disabled, onChange }: {
  label: string; description: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-intent-primary/10 p-2">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">{label}</div>
        <div className="text-[10px] text-text-ghost/60">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function formatTakeoverState(state: ExplorerTakeoverState) {
  if (state === 'armed') return 'armé';
  if (state === 'restoring') return 'restaure';
  if (state === 'degraded') return 'dégradé';
  return 'natif';
}
