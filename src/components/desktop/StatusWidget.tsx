import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WidgetFrame } from './WidgetFrame';
import { useSystemBridge } from '@/hooks/useSystemBridge';

interface StatusWidgetProps {
  brainMode: string | null;
  isAutonomous: boolean;
  autonomyCount: number;
  autonomyLimit: number;
  activeTasks: number;
  onMouseStateChange?: (inside: boolean) => void;
}

/**
 * StatusWidget - Mini widget d'état système en coin
 * Affiche le bridge, brain mode, autonomie
 */
export function StatusWidget({
  brainMode,
  isAutonomous,
  autonomyCount,
  autonomyLimit,
  activeTasks,
  onMouseStateChange,
}: StatusWidgetProps) {
  const { isAvailable, systemInfo } = useSystemBridge();

  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}G`;
  };

  return (
    <WidgetFrame
      title="SYSTEM"
      accent="neutral"
      defaultPosition={{ x: window.innerWidth - 280, y: 24 }}
      onMouseStateChange={onMouseStateChange}
      compact
    >
      <div className="w-[240px] px-3 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px]">
          {/* Bridge status */}
          <div className="flex items-center gap-1.5">
            <motion.div
              className={cn('w-1.5 h-1.5 rounded-full', isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40')}
              animate={isAvailable ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={cn('uppercase tracking-wider font-light', isAvailable ? 'text-intent-success' : 'text-text-ghost')}>
              {isAvailable ? 'BRIDGE' : 'WEB'}
            </span>
          </div>

          {/* Brain mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-text-ghost/50">🧠</span>
            <span className={cn(
              'uppercase tracking-wider font-light',
              brainMode === 'thinking' ? 'text-intent-primary' :
              brainMode === 'executing' ? 'text-intent-focus' :
              'text-text-ghost'
            )}>
              {brainMode || 'IDLE'}
            </span>
          </div>

          {/* Autonomy */}
          <div className="flex items-center gap-1.5">
            <motion.div
              className={cn('w-1.5 h-1.5 rounded-full', isAutonomous ? 'bg-intent-primary' : 'bg-intent-focus')}
              animate={isAutonomous ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className={cn('uppercase tracking-wider font-light', isAutonomous ? 'text-intent-primary' : 'text-intent-focus')}>
              {isAutonomous ? 'AUTO' : 'PAUSE'}
            </span>
          </div>

          {/* Action counter */}
          <div className="flex items-center gap-1.5">
            <span className="text-text-ghost/50 font-mono">{autonomyCount}/{autonomyLimit}</span>
          </div>

          {/* System info (Electron only) */}
          {isAvailable && systemInfo && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-text-ghost/40">CPU</span>
                <span className="text-text-secondary font-mono">{systemInfo.cpus}C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-ghost/40">MEM</span>
                <span className="text-text-secondary font-mono">{formatMemory(systemInfo.memory.free)}</span>
              </div>
            </>
          )}

          {/* Active tasks */}
          {activeTasks > 0 && (
            <div className="col-span-2 flex items-center gap-1.5">
              <motion.span
                className="text-intent-focus"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⚙️
              </motion.span>
              <span className="text-intent-focus font-mono">{activeTasks} TASK{activeTasks > 1 ? 'S' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
