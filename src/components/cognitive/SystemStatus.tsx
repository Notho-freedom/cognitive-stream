import { motion } from 'framer-motion';
import { Terminal, Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { useSystemBridge } from '@/hooks/useSystemBridge';

// ═══════════════════════════════════════════════════════════════
// SYSTEM STATUS INDICATOR
// Affiche l'état de la connexion système et les infos de base
// ═══════════════════════════════════════════════════════════════

export function SystemStatus() {
  const { isAvailable, systemInfo } = useSystemBridge();

  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-surface-glass/30 border border-glass-edge/20"
    >
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        {isAvailable ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-intent-success" />
            <span className="text-[10px] font-mono text-intent-success uppercase tracking-wider">
              BRIDGED
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-text-ghost/50" />
            <span className="text-[10px] font-mono text-text-ghost/50 uppercase tracking-wider">
              BROWSER
            </span>
          </>
        )}
      </div>

      {/* System Info (only when connected) */}
      {isAvailable && systemInfo && (
        <>
          <div className="w-px h-4 bg-glass-edge/30" />
          
          {/* Platform */}
          <div className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-text-ghost/60" />
            <span className="text-[10px] font-mono text-text-ghost/60">
              {systemInfo.platform}/{systemInfo.arch}
            </span>
          </div>

          {/* CPU */}
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-text-ghost/60" />
            <span className="text-[10px] font-mono text-text-ghost/60">
              {systemInfo.cpus}c
            </span>
          </div>

          {/* Memory */}
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-text-ghost/60" />
            <span className="text-[10px] font-mono text-text-ghost/60">
              {formatMemory(systemInfo.memory.free)}/{formatMemory(systemInfo.memory.total)}
            </span>
          </div>

          {/* Uptime */}
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[10px] font-mono text-text-ghost/40">
              ↑{formatUptime(systemInfo.uptime)}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
