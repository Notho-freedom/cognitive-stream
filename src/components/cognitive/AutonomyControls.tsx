import { useEffect, useMemo, useState } from 'react';
import { FuturisticFrame } from './FuturisticFrame';
import { cn } from '@/lib/utils';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import type { AutonomyLevel } from '@/lib/brain';

const STORAGE_KEY = 'cognitive.autonomy.preferences';

const levelOptions: Array<{ value: AutonomyLevel; label: string }> = [
  { value: 'auto-run', label: 'Auto-run' },
  { value: 'propose-only', label: 'Propose-only' },
  { value: 'guided', label: 'Guidé' },
];

interface AutonomyControlsProps {
  brain: ReturnType<typeof useCognitiveBrain>;
  className?: string;
}

export function AutonomyControls({ brain, className }: AutonomyControlsProps) {
  const {
    isAutonomousMode,
    autonomyActionCount,
    autonomyLimit,
    pauseAutonomy,
    resumeAutonomy,
    setAutonomyConfig,
  } = brain;

  const [level, setLevel] = useState<AutonomyLevel>('auto-run');
  const [maxActions, setMaxActions] = useState<number>(autonomyLimit || 50);
  const [isHydrated, setIsHydrated] = useState(false);

  const statusLabel = useMemo(() => (
    isAutonomousMode ? 'ACTIF' : 'PAUSE'
  ), [isAutonomousMode]);

  const persistPreferences = (nextLevel: AutonomyLevel, nextMaxActions: number) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        level: nextLevel,
        maxAutoActions: nextMaxActions,
      })
    );
  };

  useEffect(() => {
    if (isHydrated || typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        level?: AutonomyLevel;
        maxAutoActions?: number;
      };

      const nextLevel = parsed.level ?? 'auto-run';
      const nextMaxActions = parsed.maxAutoActions ?? (autonomyLimit ?? 50);

      setLevel(nextLevel);
      setMaxActions(nextMaxActions);

      setAutonomyConfig({
        level: nextLevel,
        safeguards: {
          maxAutoActions: nextMaxActions,
        },
      });
    } catch {
      // Ignore invalid payloads
    } finally {
      setIsHydrated(true);
    }
  }, [autonomyLimit, isHydrated, setAutonomyConfig]);

  const handleLevelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLevel = event.target.value as AutonomyLevel;
    setLevel(nextLevel);
    setAutonomyConfig({ level: nextLevel });
    persistPreferences(nextLevel, maxActions);
  };

  const handleMaxActionsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) return;
    const nextMaxActions = Math.max(1, Math.min(value, 999));
    setMaxActions(nextMaxActions);
    setAutonomyConfig({
      safeguards: {
        maxAutoActions: nextMaxActions,
      },
    });
    persistPreferences(level, nextMaxActions);
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!autonomyLimit) return;
    if (autonomyLimit === maxActions) return;
    setMaxActions(autonomyLimit);
  }, [autonomyLimit, isHydrated, maxActions]);

  return (
    <FuturisticFrame variant="minimal" className={cn('w-full', className)}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] uppercase tracking-[0.35em] text-text-ghost">
            AUTONOMIE
          </span>
          <span
            className={cn(
              'text-[9px] uppercase tracking-[0.25em]',
              isAutonomousMode ? 'text-intent-success' : 'text-intent-focus'
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] text-text-secondary mb-3">
          <div className="flex flex-col">
            <span className="text-text-ghost/70">Mode</span>
            <span className="text-text-primary">{level}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-ghost/70">Actions</span>
            <span className="text-text-primary">{autonomyActionCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-ghost/70">Limite</span>
            <span className="text-text-primary">{autonomyLimit}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={pauseAutonomy}
            className="flex-1 border border-intent-focus/50 text-intent-focus text-[10px] uppercase tracking-[0.2em] py-2 transition-colors hover:bg-intent-focus/10"
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
            }}
          >
            Pause
          </button>
          <button
            type="button"
            onClick={resumeAutonomy}
            className="flex-1 border border-intent-success/50 text-intent-success text-[10px] uppercase tracking-[0.2em] py-2 transition-colors hover:bg-intent-success/10"
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
            }}
          >
            Reprendre
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[10px] text-text-secondary">
          <label className="flex flex-col gap-1">
            <span className="text-text-ghost/70 uppercase tracking-[0.2em]">Niveau</span>
            <select
              value={level}
              onChange={handleLevelChange}
              className="bg-transparent border border-intent-neutral/30 text-text-primary px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
            >
              {levelOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-background text-text-primary">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-text-ghost/70 uppercase tracking-[0.2em]">Limite</span>
            <input
              type="number"
              min={1}
              max={999}
              value={maxActions}
              onChange={handleMaxActionsChange}
              className="bg-transparent border border-intent-neutral/30 text-text-primary px-2 py-1 text-[10px]"
            />
          </label>
        </div>
      </div>
    </FuturisticFrame>
  );
}
