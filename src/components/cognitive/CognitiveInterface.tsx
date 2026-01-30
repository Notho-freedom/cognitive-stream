import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from './FuturisticFrame';
import { StateIndicator } from './StateIndicator';
import { ThoughtStream } from './ThoughtStream';
import { CognitiveRenderer } from './dynamic/CognitiveRenderer';
import { useCognitiveChat } from '@/hooks/useCognitiveChat';
import { cn } from '@/lib/utils';

interface CognitiveInterfaceProps {
  className?: string;
}

export function CognitiveInterface({ className }: CognitiveInterfaceProps) {
  const [input, setInput] = useState('');
  const { 
    messages, 
    schema, 
    thought,
    isLoading, 
    isStreaming, 
    error, 
    sendMessage, 
    handleAction,
    reset 
  } = useCognitiveChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const getIndicatorMode = () => {
    if (isLoading && !isStreaming) return 'thinking';
    if (isStreaming) return 'responding';
    if (error) return 'warning';
    if (schema) return 'success';
    return 'idle';
  };

  const getStateLabel = () => {
    if (isLoading && !isStreaming) return 'TRAITEMENT...';
    if (isStreaming) return 'RÉPONSE EN COURS';
    if (error) return 'ERREUR';
    if (schema) return 'TERMINÉ';
    return 'EN ATTENTE';
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Main Response Card */}
      <AnimatePresence mode="wait">
        {(isLoading || schema || error || thought) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <FuturisticFrame variant="primary" animated={isLoading}>
              <div className="p-6">
                {/* Header bar */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-intent-primary/20">
                  <div className="flex items-center gap-3">
                    <StateIndicator mode={getIndicatorMode()} size="sm" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                        {getStateLabel()}
                      </span>
                      <span className="text-[9px] text-text-ghost tracking-wider">
                        COGNITIVE.UI.v1.0
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <motion.div
                      className="relative w-2 h-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="absolute inset-0 rounded-full bg-intent-primary/60" />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-intent-primary"
                        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </motion.div>
                    <motion.span
                      className="text-[8px] text-text-ghost font-mono"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      SYS.OK
                    </motion.span>
                  </div>
                </div>

                {/* Thought display */}
                {thought && (
                  <div className="mb-4 p-3 bg-intent-secondary/5 border border-intent-secondary/20" 
                       style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}>
                    <span className="text-[9px] text-intent-secondary uppercase tracking-wider">
                      PENSÉE INTERNE
                    </span>
                    <p className="text-xs text-text-ghost mt-1 font-light italic">
                      {thought}
                    </p>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="p-4 border border-intent-focus/30 bg-intent-focus/5"
                       style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}>
                    <p className="text-sm text-intent-focus">{error}</p>
                  </div>
                )}

                {/* Loading state */}
                {isLoading && !schema && !error && (
                  <div className="min-h-[80px] flex items-center justify-center">
                    <ThoughtStream 
                      text="Analyse en cours..." 
                      speed="slow" 
                      isStreaming={true}
                    />
                  </div>
                )}

                {/* Dynamic UI Schema */}
                {schema && (
                  <div className="min-h-[60px]">
                    <CognitiveRenderer 
                      schema={schema} 
                      onAction={handleAction}
                    />
                  </div>
                )}

                {/* Bottom data bar */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-intent-primary/10">
                  <div className="flex items-center gap-4 text-[8px] text-text-ghost font-mono tracking-wide">
                    <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
                      MSG:{messages.length}
                    </motion.span>
                    <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}>
                      GROQ.AI
                    </motion.span>
                  </div>
                  <button
                    onClick={reset}
                    className="text-[8px] text-text-ghost hover:text-intent-primary transition-colors uppercase tracking-wider"
                  >
                    RESET
                  </button>
                </div>
              </div>
            </FuturisticFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <FuturisticFrame variant="minimal">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pose une question à l'IA..."
                  disabled={isLoading}
                  className={cn(
                    'w-full bg-transparent text-text-primary placeholder:text-text-ghost/50',
                    'text-sm font-light tracking-wide px-4 py-3 outline-none',
                    'border border-intent-neutral/20 focus:border-intent-primary/50 transition-colors',
                  )}
                  style={{
                    clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                  }}
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  'px-6 py-3 text-xs uppercase tracking-wider font-medium transition-all',
                  'bg-intent-primary/20 hover:bg-intent-primary/30 text-text-primary',
                  'border border-intent-primary/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{
                  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                }}
              >
                {isLoading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block"
                  >
                    ◐
                  </motion.span>
                ) : (
                  'Envoyer'
                )}
              </button>
            </div>
          </div>
        </FuturisticFrame>
      </motion.form>
    </div>
  );
}
