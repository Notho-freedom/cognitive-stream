import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';
import { CognitiveRenderer } from '@/components/cognitive/dynamic/CognitiveRenderer';
import { WidgetFrame } from './WidgetFrame';
import { StateIndicator } from '@/components/cognitive/StateIndicator';
import type { IndicatorMode } from '@/components/cognitive/StateIndicator';

interface CommandWidgetProps {
  onSend: (message: string) => void;
  onAction: (action: ActionPayload) => void;
  onConfirmAction: (message?: string) => void;
  schema: CognitiveUISchema | null;
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  pendingAction: ActionPayload | null;
  aiProvider: string | null;
  aiModel: string | null;
  isLocalFallback: boolean;
  brainMode: string | null;
  messageCount: number;
  onMouseStateChange?: (inside: boolean) => void;
  onReset: () => void;
}

/**
 * CommandWidget - Barre de commande flottante style Spotlight/Alfred
 * Point d'interaction principal avec l'IA cognitive
 */
export function CommandWidget({
  onSend,
  onAction,
  onConfirmAction,
  schema,
  thought,
  isLoading,
  isStreaming,
  error,
  pendingAction,
  aiProvider,
  aiModel,
  isLocalFallback,
  brainMode,
  messageCount,
  onMouseStateChange,
  onReset,
}: CommandWidgetProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-expand when there's content to show
  useEffect(() => {
    if (schema || error || isLoading) {
      setIsExpanded(true);
    }
  }, [schema, error, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (pendingAction) {
      onConfirmAction(input.trim());
    } else {
      onSend(input.trim());
    }
    setInput('');
  };

  const getIndicatorMode = (): IndicatorMode => {
    if (isLoading && !isStreaming) return 'thinking';
    if (isStreaming) return 'responding';
    if (error) return 'warning';
    if (schema) return 'success';
    if (pendingAction) return 'listening';
    return 'idle';
  };

  const getProviderDisplay = () => {
    if (!aiProvider) return '';
    const modelName = aiModel ? aiModel.split('/').pop()?.toUpperCase() : '';
    if (isLocalFallback) return `⚡${modelName || aiProvider.toUpperCase()}`;
    return modelName || aiProvider.toUpperCase();
  };

  return (
    <WidgetFrame
      title="NEURAL STREAM"
      accent="primary"
      defaultPosition={{ x: window.innerWidth / 2 - 280, y: window.innerHeight - 160 }}
      onMouseStateChange={onMouseStateChange}
    >
      <div className="w-[560px]">
        {/* Response area (expandable) */}
        <AnimatePresence>
          {isExpanded && (schema || error || isLoading) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="p-4 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(187 85% 53% / 0.3) transparent' }}>
                {/* Thought display */}
                {thought && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-3 text-[10px] text-text-ghost italic tracking-wide truncate"
                  >
                    💭 {thought}
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-3 border border-intent-focus/30 bg-intent-focus/5 mb-3"
                    style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}>
                    <p className="text-xs text-intent-focus">{error}</p>
                  </div>
                )}

                {/* Loading */}
                {isLoading && !schema && !error && (
                  <div className="flex items-center justify-center py-6">
                    <motion.div
                      className="flex items-center gap-2 text-xs text-text-ghost"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ◐
                      </motion.span>
                      Traitement...
                    </motion.div>
                  </div>
                )}

                {/* Schema renderer */}
                {schema && (
                  <CognitiveRenderer schema={schema} onAction={onAction} />
                )}
              </div>

              {/* Collapse button */}
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onReset();
                }}
                className="w-full py-1 text-[8px] text-text-ghost hover:text-intent-primary transition-colors uppercase tracking-wider border-t border-intent-neutral/10"
              >
                RÉDUIRE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <StateIndicator mode={getIndicatorMode()} size="sm" />

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingAction ? "Confirmez..." : "Demandez à l'IA..."}
              disabled={isLoading}
              className={cn(
                'flex-1 bg-transparent text-text-primary placeholder:text-text-ghost/40',
                'text-sm font-light tracking-wide outline-none',
              )}
              autoFocus
            />

            {/* Status chips */}
            <div className="flex items-center gap-2 text-[7px] text-text-ghost font-mono tracking-wider">
              {brainMode && (
                <span className="text-intent-primary">{brainMode}</span>
              )}
              {aiProvider && (
                <span className={isLocalFallback ? 'text-intent-focus' : 'text-intent-secondary'}>
                  {getProviderDisplay()}
                </span>
              )}
              <span>#{messageCount}</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                'px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium transition-all',
                'text-text-primary border border-intent-primary/40',
                'hover:bg-intent-primary/20 disabled:opacity-30 disabled:cursor-not-allowed',
              )}
              style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
            >
              {isLoading ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>◐</motion.span>
              ) : pendingAction ? '✓' : '→'}
            </button>
          </div>
        </form>
      </div>
    </WidgetFrame>
  );
}
