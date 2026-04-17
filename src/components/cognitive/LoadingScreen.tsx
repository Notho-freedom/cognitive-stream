import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

type Phase = 'init' | 'modules' | 'bridge' | 'ai' | 'desktop' | 'welcome' | 'done';

const SEQUENCE: Array<{ phase: Phase; label: string; durationMs: number }> = [
  { phase: 'init', label: 'INIT', durationMs: 350 },
  { phase: 'modules', label: 'MODULES', durationMs: 450 },
  { phase: 'bridge', label: 'BRIDGE', durationMs: 500 },
  { phase: 'ai', label: 'AI CORE', durationMs: 500 },
  { phase: 'desktop', label: 'BUREAU', durationMs: 500 },
];

const TOTAL_MS = SEQUENCE.reduce((sum, s) => sum + s.durationMs, 0);

export function LoadingScreen({ onComplete, minDuration = 2500 }: LoadingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('init');
  const [progress, setProgress] = useState(0);

  // Run sequence
  useEffect(() => {
    let elapsed = 0;
    const start = Date.now();
    const timers: NodeJS.Timeout[] = [];

    SEQUENCE.forEach((step, idx) => {
      elapsed += step.durationMs;
      timers.push(setTimeout(() => {
        setStepIndex(idx + 1);
        setPhase(SEQUENCE[Math.min(idx + 1, SEQUENCE.length - 1)]?.phase ?? 'desktop');
      }, elapsed));
    });

    timers.push(setTimeout(() => setPhase('welcome'), Math.max(TOTAL_MS, minDuration - 350)));
    timers.push(setTimeout(() => setPhase('done'), Math.max(TOTAL_MS + 350, minDuration)));

    const progressInterval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / Math.max(TOTAL_MS, minDuration)) * 100);
      setProgress(pct);
    }, 50);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [minDuration]);

  useEffect(() => {
    if (phase === 'done' && onComplete) {
      const t = setTimeout(onComplete, 350);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, hsl(187 85% 53% / 0.10), transparent),
              radial-gradient(ellipse 60% 40% at 80% 100%, hsl(270 80% 65% / 0.06), transparent),
              hsl(220 20% 4%)
            `,
          }}
        >
          {/* Ambient pulses */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-intent-primary/5 rounded-full blur-[150px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative">
            <motion.div
              className="relative bg-surface-elevated/80 backdrop-blur-xl border border-intent-primary/30"
              style={{
                clipPath: 'polygon(14px 0%, calc(100% - 14px) 0%, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0% calc(100% - 14px), 0% 14px)',
              }}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="absolute top-0 left-3 w-12 h-[1px] bg-gradient-to-r from-intent-primary to-transparent" />
              <div className="absolute top-3 left-0 h-12 w-[1px] bg-gradient-to-b from-intent-primary to-transparent" />
              <div className="absolute bottom-0 right-3 w-12 h-[1px] bg-gradient-to-l from-intent-primary to-transparent" />
              <div className="absolute bottom-3 right-0 h-12 w-[1px] bg-gradient-to-t from-intent-primary to-transparent" />

              <div className="px-14 py-12 min-w-[380px]">
                {/* Logo */}
                <div className="text-center mb-8">
                  <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 mb-5"
                    animate={{ rotate: phase !== 'welcome' ? 360 : 0 }}
                    transition={{ duration: 8, repeat: phase !== 'welcome' ? Infinity : 0, ease: 'linear' }}
                  >
                    <div
                      className="w-full h-full border-2 border-intent-primary/40 relative"
                      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                    >
                      <motion.div
                        className="absolute inset-2 bg-intent-primary/20"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-intent-primary text-2xl font-light">◈</span>
                      </div>
                    </div>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {phase === 'welcome' ? (
                      <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <h1 className="text-[14px] uppercase tracking-[0.4em] text-intent-primary font-light mb-1">
                          WELCOME
                        </h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-text-ghost">
                          Bureau prêt
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div key="boot">
                        <h1 className="text-[12px] uppercase tracking-[0.35em] text-text-primary font-light mb-1">
                          COGNITIVE STREAM
                        </h1>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-text-ghost">
                          OPERATING SYSTEM v1.0
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div
                    className="h-[2px] bg-surface-overlay overflow-hidden"
                    style={{ clipPath: 'polygon(2px 0%, calc(100% - 2px) 0%, 100% 50%, calc(100% - 2px) 100%, 2px 100%, 0% 50%)' }}
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-intent-primary via-intent-primary to-intent-secondary"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] text-text-ghost uppercase tracking-wider font-mono">
                      {phase === 'welcome' ? 'PRÊT' : SEQUENCE[Math.min(stepIndex, SEQUENCE.length - 1)]?.label}
                    </span>
                    <span className="text-[8px] text-intent-primary font-mono">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                {/* Status lines */}
                <div className="space-y-2">
                  {SEQUENCE.map((s, i) => (
                    <StatusLine
                      key={s.phase}
                      label={s.label}
                      status={stepIndex > i ? 'ok' : stepIndex === i ? 'loading' : 'pending'}
                      delay={i * 0.05}
                    />
                  ))}
                </div>
              </div>

              {/* Scan line */}
              <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  clipPath: 'polygon(14px 0%, calc(100% - 14px) 0%, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0% calc(100% - 14px), 0% 14px)',
                }}
              >
                <motion.div
                  className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/50 to-transparent"
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusLine({ label, status, delay }: {
  label: string; status: 'pending' | 'loading' | 'ok'; delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="w-4 flex justify-center">
        {status === 'pending' && <span className="text-[8px] text-text-ghost">○</span>}
        {status === 'loading' && (
          <motion.span
            className="text-[8px] text-intent-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >◐</motion.span>
        )}
        {status === 'ok' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px] text-intent-secondary">◆</motion.span>
        )}
      </div>
      <span className={`text-[9px] uppercase tracking-wider font-mono ${
        status === 'ok' ? 'text-text-secondary' :
        status === 'loading' ? 'text-intent-primary' : 'text-text-ghost'
      }`}>
        {label}
      </span>
      {status === 'ok' && (
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[8px] text-intent-secondary/60 font-mono ml-auto"
        >OK</motion.span>
      )}
    </motion.div>
  );
}
