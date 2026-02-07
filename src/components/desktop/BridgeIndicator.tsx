import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';

interface BridgeIndicatorProps {
  brainMode: string | null;
  isAutonomous: boolean;
  autonomyCount: number;
  autonomyLimit: number;
  activeTasks: number;
  onMouseStateChange?: (inside: boolean) => void;
}

/**
 * BridgeIndicator — Indicateur compact coin supérieur gauche
 * Affiche le statut du pont système et le mode du cerveau
 */
export function BridgeIndicator({
  brainMode,
  isAutonomous,
  autonomyCount,
  autonomyLimit,
  activeTasks,
  onMouseStateChange,
}: BridgeIndicatorProps) {
  const { isAvailable, systemInfo } = useSystemBridge();

  const formatMem = (bytes: number) => `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-4 z-50"
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{
          background: 'hsl(220 22% 8% / 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          clipPath: 'polygon(8px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 8px)',
        }}
      >
        {/* Bridge dot */}
        <motion.div
          className={cn(
            'w-2 h-2 rounded-full',
            isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40',
          )}
          animate={isAvailable ? { opacity: [0.6, 1, 0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Info */}
        <div className="flex items-center gap-2 text-[8px] font-mono tracking-wider">
          <span className={cn('uppercase', isAvailable ? 'text-intent-success' : 'text-text-ghost')}>
            {isAvailable ? 'SYS' : 'WEB'}
          </span>

          {brainMode && (
            <>
              <span className="text-text-ghost/30">|</span>
              <span className="text-intent-primary">{brainMode}</span>
            </>
          )}

          {isAutonomous && (
            <>
              <span className="text-text-ghost/30">|</span>
              <motion.span
                className="text-intent-secondary"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                AUTO {autonomyCount}/{autonomyLimit}
              </motion.span>
            </>
          )}

          {activeTasks > 0 && (
            <>
              <span className="text-text-ghost/30">|</span>
              <motion.span
                className="text-intent-focus"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {activeTasks}T
              </motion.span>
            </>
          )}

          {isAvailable && systemInfo && (
            <>
              <span className="text-text-ghost/30">|</span>
              <span className="text-text-ghost">{systemInfo.cpus}C</span>
              <span className="text-text-ghost">{formatMem(systemInfo.memory.free)}</span>
            </>
          )}
        </div>
      </div>

      {/* Top edge accent */}
      <div
        className="absolute top-0 left-[12px] right-[8px] h-px"
        style={{ background: 'linear-gradient(90deg, hsl(187 85% 53% / 0.6), hsl(187 85% 35% / 0.2))' }}
      />
      <div
        className="absolute bottom-0 left-[8px] right-[12px] h-px"
        style={{ background: 'linear-gradient(90deg, hsl(187 85% 35% / 0.2), hsl(187 85% 53% / 0.3))' }}
      />
    </motion.div>
  );
}
