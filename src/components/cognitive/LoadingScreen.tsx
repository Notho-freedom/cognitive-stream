import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number; // Minimum display time in ms
}

export function LoadingScreen({ onComplete, minDuration = 1500 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'init' | 'loading' | 'ready'>('init');

  useEffect(() => {
    // Start loading after brief init
    const initTimer = setTimeout(() => setPhase('loading'), 200);
    
    return () => clearTimeout(initTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 15 + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('ready'), 300);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'ready' && onComplete) {
      const timer = setTimeout(onComplete, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'ready' ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-intent-primary/5 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-intent-secondary/5 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* Main loading card */}
      <div className="relative">
        {/* GX Frame */}
        <motion.div
          className="relative bg-surface-elevated/80 backdrop-blur-xl border border-intent-primary/30"
          style={{
            clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)',
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-3 w-8 h-[1px] bg-gradient-to-r from-intent-primary/80 to-transparent" />
          <div className="absolute top-3 left-0 h-8 w-[1px] bg-gradient-to-b from-intent-primary/80 to-transparent" />
          <div className="absolute bottom-0 right-3 w-8 h-[1px] bg-gradient-to-l from-intent-primary/80 to-transparent" />
          <div className="absolute bottom-3 right-0 h-8 w-[1px] bg-gradient-to-t from-intent-primary/80 to-transparent" />

          <div className="px-12 py-10 min-w-[320px]">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 mb-4"
                animate={{ rotate: phase === 'loading' ? 360 : 0 }}
                transition={{ duration: 8, repeat: phase === 'loading' ? Infinity : 0, ease: 'linear' }}
              >
                <div 
                  className="w-full h-full border-2 border-intent-primary/40 relative"
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                >
                  <motion.div
                    className="absolute inset-2 bg-intent-primary/20"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-intent-primary text-xl font-light">◈</span>
                  </div>
                </div>
              </motion.div>
              
              <h1 className="text-[11px] uppercase tracking-[0.3em] text-text-primary font-light mb-1">
                COGNITIVE UI
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-text-ghost">
                SYSTÈME v1.0
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div 
                className="h-[2px] bg-surface-overlay overflow-hidden"
                style={{
                  clipPath: 'polygon(2px 0%, calc(100% - 2px) 0%, 100% 50%, calc(100% - 2px) 100%, 2px 100%, 0% 50%)',
                }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-intent-primary via-intent-primary to-intent-secondary"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[8px] text-text-ghost uppercase tracking-wider font-mono">
                  {phase === 'init' ? 'INITIALISATION' : phase === 'loading' ? 'CHARGEMENT' : 'PRÊT'}
                </span>
                <span className="text-[8px] text-intent-primary font-mono">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Status lines */}
            <div className="space-y-2">
              <StatusLine 
                label="MODULES" 
                status={progress > 20 ? 'ok' : 'loading'} 
                delay={0} 
              />
              <StatusLine 
                label="INTERFACE" 
                status={progress > 50 ? 'ok' : progress > 20 ? 'loading' : 'pending'} 
                delay={0.1} 
              />
              <StatusLine 
                label="CONNEXION AI" 
                status={progress > 80 ? 'ok' : progress > 50 ? 'loading' : 'pending'} 
                delay={0.2} 
              />
            </div>
          </div>

          {/* Scan line */}
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)',
            }}
          >
            <motion.div
              className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/40 to-transparent"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatusLine({ 
  label, 
  status, 
  delay 
}: { 
  label: string; 
  status: 'pending' | 'loading' | 'ok';
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="w-4 flex justify-center">
        {status === 'pending' && (
          <span className="text-[8px] text-text-ghost">○</span>
        )}
        {status === 'loading' && (
          <motion.span
            className="text-[8px] text-intent-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ◐
          </motion.span>
        )}
        {status === 'ok' && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[8px] text-intent-secondary"
          >
            ◆
          </motion.span>
        )}
      </div>
      <span className={`text-[9px] uppercase tracking-wider font-mono ${
        status === 'ok' ? 'text-text-secondary' : 
        status === 'loading' ? 'text-intent-primary' : 
        'text-text-ghost'
      }`}>
        {label}
      </span>
      {status === 'ok' && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[8px] text-intent-secondary/60 font-mono ml-auto"
        >
          OK
        </motion.span>
      )}
    </motion.div>
  );
}
