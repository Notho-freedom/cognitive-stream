import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from './FuturisticFrame';
import { StateIndicator } from './StateIndicator';
import { ThoughtStream } from './ThoughtStream';
import { CognitiveRenderer } from './dynamic/CognitiveRenderer';
import { useCognitiveChat } from '@/hooks/useCognitiveChat';
import { useNotifications } from './NotificationQueue';
import { cn } from '@/lib/utils';

// Mapping des largeurs contrôlées par l'IA
const widthClasses = {
  xs: 'w-[20vw]',    // 448px - Petites infos, confirmations
  sm: 'w-[30vw]',    // 512px - Formulaires simples
  md: 'w-[50vw]',   // 672px - Par défaut, équilibré
  lg: 'w-[75vw]',   // 896px - Tableaux, grilles
  xl: 'w-[90vw]',   // 1152px - Dashboards, visualisations
  full: 'w-[95vw]', // 1280px - Pleine largeur
};

// Mapping des hauteurs maximales
const maxHeightClasses = {
  sm: 'max-h-[40vh]',   // Courts messages
  md: 'max-h-[60vh]',   // Standard
  lg: 'max-h-[75vh]',   // Listes longues
  xl: 'max-h-[85vh]',   // Contenu riche
  screen: 'max-h-[90vh]', // Quasi plein écran
};

interface CognitiveInterfaceProps {
  className?: string;
}

export function CognitiveInterface({ className }: CognitiveInterfaceProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  // Get notification push function
  const { push: notifyPush } = useNotifications();
  
  const { 
    messages, 
    schema, 
    thought,
    isLoading, 
    isStreaming, 
    error,
    pendingAction,
    aiProvider,
    sendMessage, 
    handleAction,
    confirmAction,
    reset 
  } = useCognitiveChat(notifyPush);

  // Auto-remplir l'input avec un contexte quand une action est en attente
  useEffect(() => {
    if (pendingAction) {
      const actionType = pendingAction.payload.actionType as string;
      const value = pendingAction.payload.value || pendingAction.payload.item;
      
      if (actionType === 'list-select') {
        setInput(`J'ai sélectionné: "${value}". `);
      }
    }
  }, [pendingAction]);

  // Récupérer les dimensions depuis le schéma
  const layout = schema?.layout || {};
  const widthClass = widthClasses[layout.width || 'md'];
  const maxHeightClass = layout.maxHeight ? maxHeightClasses[layout.maxHeight] : '';
  const isScrollable = layout.scrollable !== false;
  const isCentered = layout.centered !== false;

  // Handle keyboard navigation for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const userMessages = messages.filter(m => m.role === 'user').map(m => {
        try {
          const parsed = JSON.parse(m.content);
          return parsed.text || m.content;
        } catch {
          return m.content;
        }
      });
      
      if (userMessages.length > 0) {
        const newIndex = historyIndex < userMessages.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(userMessages[userMessages.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const userMessages = messages.filter(m => m.role === 'user').map(m => {
          try {
            const parsed = JSON.parse(m.content);
            return parsed.text || m.content;
          } catch {
            return m.content;
          }
        });
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(userMessages[userMessages.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setHistoryIndex(-1);
      setInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Reset history navigation
    setHistoryIndex(-1);
    
    if (pendingAction) {
      confirmAction(input.trim());
    } else {
      sendMessage(input.trim());
    }
    
    setInput('');
  };

  const getIndicatorMode = () => {
    if (isLoading && !isStreaming) return 'thinking';
    if (isStreaming) return 'responding';
    if (error) return 'warning';
    if (schema) return 'success';
    if (pendingAction) return 'listening';
    return 'idle';
  };

  const getStateLabel = () => {
    if (isLoading && !isStreaming) return 'TRAITEMENT';
    if (isStreaming) return 'RÉPONSE';
    if (error) return 'ERREUR';
    if (schema) return 'TERMINÉ';
    if (pendingAction) return 'ATTENTE';
    return 'PRÊT';
  };

  return (
    <div className={cn(widthClass, isCentered && 'mx-auto', className)}>
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
                {/* Header bar with dynamic title/description from schema metadata */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-intent-primary/20">
                  <div className="flex items-center gap-3">
                    <StateIndicator mode={getIndicatorMode()} size="sm" />
                    <div className="flex flex-col">
                      {/* Dynamic title from schema.metadata or fallback to state label */}
                      <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                        {schema?.metadata?.title || getStateLabel()}
                      </span>
                      {/* Thought as description - shows internal reasoning */}
                      <span className="text-[9px] text-text-ghost tracking-wide max-w-[300px] truncate" title={thought || undefined}>
                        {thought || schema?.metadata?.description || 'COGNITIVE.UI.v1.0'}
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

                {/* Pending Action Notice */}
                {pendingAction && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-intent-primary/10 border border-intent-primary/30"
                    style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div 
                        className="w-2 h-2 bg-intent-primary rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-[9px] text-intent-primary uppercase tracking-wider font-medium">
                        ACTION EN ATTENTE
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Complétez votre message ci-dessous pour envoyer l'action
                    </p>
                  </motion.div>
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

                {/* Dynamic UI Schema with controlled dimensions */}
                {schema && (
                  <div 
                    className={cn(
                      'min-h-[60px]',
                      maxHeightClass,
                      isScrollable && 'overflow-y-auto overflow-x-hidden'
                    )}
                    style={{
                      // Scrollbar custom styling
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'hsl(var(--intent-primary) / 0.3) transparent',
                    }}
                  >
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
                    {/* AI Provider indicator */}
                    <motion.span 
                      animate={{ opacity: [0.5, 1, 0.5] }} 
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                      className={aiProvider ? 'text-intent-secondary' : ''}
                    >
                      {aiProvider ? aiProvider.toUpperCase() : 'AI.STANDBY'}
                    </motion.span>
                    {pendingAction && (
                      <motion.span 
                        className="text-intent-primary"
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ⏳ PENDING
                      </motion.span>
                    )}
                    {layout.width && (
                      <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.2, repeat: Infinity, delay: 1.5 }}>
                        SIZE:{layout.width.toUpperCase()}
                      </motion.span>
                    )}
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
        <FuturisticFrame variant={pendingAction ? 'primary' : 'minimal'}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setHistoryIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pendingAction 
                      ? "Complétez votre message..." 
                      : "Pose une question à l'IA..."
                  }
                  disabled={isLoading}
                  className={cn(
                    'w-full bg-transparent text-text-primary placeholder:text-text-ghost/50',
                    'text-sm font-light tracking-wide px-4 py-3 outline-none',
                    'border transition-colors',
                    pendingAction 
                      ? 'border-intent-primary/60' 
                      : 'border-intent-neutral/20 focus:border-intent-primary/50',
                  )}
                  style={{
                    clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                  }}
                  autoFocus={!!pendingAction}
                />
                {/* History indicator */}
                {historyIndex >= 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-intent-primary/60 uppercase tracking-wider"
                  >
                    ↑{historyIndex + 1}
                  </motion.span>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  'px-6 py-3 text-xs uppercase tracking-wider font-medium transition-all',
                  pendingAction
                    ? 'bg-intent-primary/30 hover:bg-intent-primary/40 border-intent-primary/70'
                    : 'bg-intent-primary/20 hover:bg-intent-primary/30 border-intent-primary/50',
                  'text-text-primary border',
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
                ) : pendingAction ? (
                  '✓ OK'
                ) : (
                  '→'
                )}
              </button>
            </div>
            
            {pendingAction && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-[10px] text-intent-primary/70 tracking-wide"
              >
                💡 Appuyez sur Entrée pour confirmer votre sélection
              </motion.p>
            )}
          </div>
        </FuturisticFrame>
      </motion.form>
    </div>
  );
}