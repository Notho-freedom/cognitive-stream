import { memo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Wifi, WifiOff, Battery, BatteryCharging } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

interface SystemTrayProps {
  brainMode: string | null;
  brainActive: boolean;
  isConnected: boolean;
}

export const SystemTray = memo(function SystemTray({
  brainMode,
  brainActive,
  isConnected,
}: SystemTrayProps) {
  const { muted, toggleMuted, play, playHover } = useSound();
  const [time, setTime] = useState(() => new Date());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-2">
      {/* Brain status */}
      <div className="flex items-center gap-1.5 px-1.5 h-7 rounded text-[10px] font-mono">
        <motion.div
          className={cn(
            'w-2 h-2 rounded-full',
            brainActive ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
          animate={brainActive ? {
            scale: [1, 1.4, 1],
            opacity: [0.6, 1, 0.6],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-muted-foreground/70 uppercase tracking-wider">
          {brainMode ?? 'VEILLE'}
        </span>
      </div>

      {/* Bridge status */}
      <div className={cn(
        'w-1.5 h-1.5 rounded-full',
        isConnected ? 'bg-emerald-400' : 'bg-muted-foreground/30',
      )} title={isConnected ? 'Système connecté' : 'Mode web'} />

      {/* Volume */}
      <button
        onClick={() => { play('click'); toggleMuted(); }}
        onMouseEnter={playHover}
        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
        title={muted ? 'Son coupé' : 'Son activé'}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>

      {/* Network */}
      <div
        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/70"
        title={online ? 'En ligne' : 'Hors ligne'}
      >
        {online ? <Wifi size={13} /> : <WifiOff size={13} className="text-intent-warning" />}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border/30" />

      {/* Clock */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex flex-col items-end px-1.5 h-7 justify-center hover:bg-[hsl(var(--explorer-hover))] rounded transition-colors"
      >
        <span className="text-[11px] font-light tabular-nums text-foreground/90 leading-tight">
          {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] text-muted-foreground/60 leading-tight">
          {time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      </button>

      {/* Quick settings popup */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 right-2 w-64 p-4 rounded-lg border border-border/40 z-[60]"
          style={{
            background: 'hsl(220 24% 5% / 0.96)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 12px 40px hsl(0 0% 0% / 0.5)',
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">État</span>
              <span className="text-[10px] text-foreground/80 font-light">{brainMode ?? 'VEILLE'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Réseau</span>
              <span className={cn('text-[10px] font-light', online ? 'text-emerald-400' : 'text-intent-warning')}>
                {online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bridge</span>
              <span className={cn('text-[10px] font-light', isConnected ? 'text-emerald-400' : 'text-muted-foreground/50')}>
                {isConnected ? 'Connecté' : 'Web'}
              </span>
            </div>
            <div className="border-t border-border/30 pt-2">
              <div className="text-center">
                <span className="text-lg font-light tabular-nums text-foreground">
                  {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});
