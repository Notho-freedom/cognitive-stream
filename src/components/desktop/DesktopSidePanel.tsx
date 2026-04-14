import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { SystemMetrics } from '@/hooks/useSystemBridge';

type PanelTab = 'system' | 'settings';
type ExplorerMode = 'global' | 'folders-only';

interface DesktopSidePanelProps {
  metrics: SystemMetrics | null;
  isAvailable: boolean;
  isCollapsed: boolean;
  activeTab: PanelTab;
  onToggleCollapse: () => void;
  onTabChange: (tab: PanelTab) => void;
  onMouseStateChange?: (inside: boolean) => void;
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
  explorerIntegrationEnabled: boolean;
  onExplorerIntegrationEnabledChange: (value: boolean) => void;
  explorerIntegrationMode: ExplorerMode;
  onExplorerIntegrationModeChange: (value: ExplorerMode) => void;
}

const PANEL_WIDTH = 320;

export function DesktopSidePanel({
  metrics,
  isAvailable,
  isCollapsed,
  activeTab,
  onToggleCollapse,
  onTabChange,
  onMouseStateChange,
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
  explorerIntegrationEnabled,
  onExplorerIntegrationEnabledChange,
  explorerIntegrationMode,
  onExplorerIntegrationModeChange,
}: DesktopSidePanelProps) {
  const memoryUsage = metrics?.memory?.usage ?? null;
  const cpuUsage = metrics?.cpu?.usage ?? null;
  const gpuUsage = metrics?.gpu?.usage ?? null;
  const gpuName = metrics?.gpu?.name ?? 'GPU';
  const diskSummary = useMemo(() => {
    if (!metrics?.disk || metrics.disk.length === 0) return null;
    const total = metrics.disk.reduce((sum, d) => sum + d.total, 0);
    const used = metrics.disk.reduce((sum, d) => sum + d.used, 0);
    const usage = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
    return { total, used, usage };
  }, [metrics?.disk]);

  const networkSummary = useMemo(() => {
    if (!metrics?.network || metrics.network.length === 0) return null;
    const rxSec = metrics.network.reduce((sum, n) => sum + (n.rxSec || 0), 0);
    const txSec = metrics.network.reduce((sum, n) => sum + (n.txSec || 0), 0);
    return { rxSec, txSec };
  }, [metrics?.network]);

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-auto"
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
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
            <span>SYS</span>
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
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40',
                      )}
                    />
                    <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost">
                      SYSTEM CORE
                    </span>
                  </div>
                  <button
                    onClick={onToggleCollapse}
                    className="text-[10px] text-text-ghost/60 hover:text-text-primary transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <TabButton active={activeTab === 'system'} onClick={() => onTabChange('system')}>
                    STATUT
                  </TabButton>
                  <TabButton active={activeTab === 'settings'} onClick={() => onTabChange('settings')}>
                    CONFIG
                  </TabButton>
                </div>

                <ScrollArea className="max-h-[66vh] pr-2">
                  <div className="space-y-4">
                    {activeTab === 'system' ? (
                      <>
                        <MetricRow
                          label="CPU"
                          value={cpuUsage !== null ? `${cpuUsage.toFixed(1)}%` : 'N/A'}
                          sub={metrics?.cpu?.model || `${metrics?.cpu?.cores || 0} cores`}
                          percent={cpuUsage ?? undefined}
                          accent="bg-intent-primary"
                        />
                        <MetricRow
                          label="RAM"
                          value={memoryUsage !== null ? `${memoryUsage.toFixed(1)}%` : 'N/A'}
                          sub={metrics?.memory ? `${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}` : '—'}
                          percent={memoryUsage ?? undefined}
                          accent="bg-intent-secondary"
                        />
                        <MetricRow
                          label="GPU"
                          value={gpuUsage !== null ? `${gpuUsage.toFixed(1)}%` : 'N/A'}
                          sub={gpuName}
                          percent={gpuUsage ?? undefined}
                          accent="bg-intent-focus"
                        />
                        <MetricRow
                          label="DISQUE"
                          value={diskSummary ? `${diskSummary.usage.toFixed(1)}%` : 'N/A'}
                          sub={diskSummary ? `${formatBytes(diskSummary.used)} / ${formatBytes(diskSummary.total)}` : '—'}
                          percent={diskSummary?.usage}
                          accent="bg-intent-warning"
                        />
                        <MetricRow
                          label="NET"
                          value={networkSummary ? `${formatBytes(networkSummary.rxSec)}/s` : 'N/A'}
                          sub={networkSummary ? `↑ ${formatBytes(networkSummary.txSec)}/s` : '—'}
                          accent="bg-intent-neutral"
                        />
                        <div className="pt-2 border-t border-intent-primary/10">
                          <InfoLine label="Uptime" value={metrics?.uptime ? formatUptime(metrics.uptime) : 'N/A'} />
                          {metrics?.temperature?.cpu !== undefined && (
                            <InfoLine label="Temp CPU" value={metrics.temperature.cpu ? `${metrics.temperature.cpu.toFixed(0)}°C` : 'N/A'} />
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <SettingRow
                          label="Sortie vocale"
                          description="Synthèse vocale du contenu"
                          checked={ttsEnabled}
                          onChange={onTtsToggle}
                        />
                        <SettingRow
                          label="Entrée vocale"
                          description={voiceInputSupported ? 'Micro actif en continu' : 'Non supporté'}
                          checked={voiceInputEnabled}
                          onChange={onVoiceInputToggle}
                          disabled={!voiceInputSupported}
                        />
                        <SettingRow
                          label="Effets sonores"
                          description="Sons UI contextuels"
                          checked={soundsEnabled}
                          onChange={onSoundsToggle}
                        />
                        <SettingRow
                          label="Mode réduit"
                          description="Animations minimales"
                          checked={reduceMotion}
                          onChange={onReduceMotionToggle}
                        />
                        <SettingRow
                          label="Apps du bureau"
                          description="Afficher le widget des applications"
                          checked={showDesktopApps}
                          onChange={onShowDesktopAppsToggle}
                        />
                        <SettingRow
                          label="Explorateur Windows"
                          description="Overwrite strict de l’explorateur"
                          checked={explorerIntegrationEnabled}
                          onChange={onExplorerIntegrationEnabledChange}
                        />

                        <div className="space-y-2 border border-intent-primary/10 p-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">Portée de l’intégration</div>
                          <div className="flex items-center gap-2">
                            <ModeButton
                              active={explorerIntegrationMode === 'global'}
                              disabled={!explorerIntegrationEnabled}
                              onClick={() => onExplorerIntegrationModeChange('global')}
                            >
                              Globale
                            </ModeButton>
                            <ModeButton
                              active={explorerIntegrationMode === 'folders-only'}
                              disabled={!explorerIntegrationEnabled}
                              onClick={() => onExplorerIntegrationModeChange('folders-only')}
                            >
                              Dossiers
                            </ModeButton>
                          </div>
                          <div className="text-[10px] text-text-ghost/60">
                            {explorerIntegrationMode === 'global'
                              ? 'Double-clic dossiers et Win+E passent par notre explorateur.'
                              : 'Seuls les dossiers et lecteurs sont redirigés.'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                            <span>Transparence</span>
                            <span>{Math.round(surfaceOpacity * 100)}%</span>
                          </div>
                          <Slider
                            value={[Math.round(surfaceOpacity * 100)]}
                            min={40}
                            max={95}
                            step={1}
                            onValueChange={(value) => {
                              const next = Math.min(0.95, Math.max(0.4, value[0] / 100));
                              onSurfaceOpacityChange(next);
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
                      </>
                    )}
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-[9px] uppercase tracking-[0.2em] border transition-colors',
        active
          ? 'text-intent-primary border-intent-primary/60'
          : 'text-text-ghost/60 border-transparent hover:border-intent-primary/30',
      )}
      style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
    >
      {children}
    </button>
  );
}

function MetricRow({
  label,
  value,
  sub,
  percent,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  percent?: number;
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-ghost">{label}</span>
        <span className="text-xs text-text-primary">{value}</span>
      </div>
      {sub && (
        <div className="text-[10px] text-text-ghost/70">{sub}</div>
      )}
      <div className="h-1 w-full bg-surface-deep/70 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', accent)}
          style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}
        />
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] text-text-ghost/70">
      <span>{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-2 py-1 text-[10px] uppercase tracking-[0.18em] border transition-colors',
        disabled
          ? 'text-text-ghost/25 border-intent-primary/10 cursor-not-allowed'
          : active
            ? 'text-intent-primary border-intent-primary/60 bg-intent-primary/10'
            : 'text-text-ghost/60 border-intent-primary/15 hover:border-intent-primary/40 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 100 ? 0 : 1)}${units[index]}`;
}

function formatUptime(seconds: number) {
  if (!seconds || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}
