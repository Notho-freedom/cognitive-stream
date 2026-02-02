import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuturisticFrame } from './FuturisticFrame';
import { StateIndicator } from './StateIndicator';
import { ThoughtStream } from './ThoughtStream';
import { CognitiveRenderer } from './dynamic/CognitiveRenderer';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import { useNotifications } from './NotificationQueue';
import { useCognitiveTTS } from '@/hooks/useCognitiveTTS';
import { cn } from '@/lib/utils';

// Mapping des largeurs contrôlées par l'IA
const widthClasses = {
  xs: 'w-[20vw]',
  sm: 'w-[30vw]',
  md: 'w-[50vw]',
  lg: 'w-[75vw]',
  xl: 'w-[90vw]',
  full: 'w-[95vw]',
};

// Mapping des hauteurs maximales
const maxHeightClasses = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[75vh]',
  xl: 'max-h-[85vh]',
  screen: 'max-h-[90vh]',
};

// Mapping des modes du cerveau pour affichage
const brainModeLabels: Record<string, string> = {
  idle: 'VEILLE',
  listening: 'ÉCOUTE',
  thinking: 'RÉFLEXION',
  planning: 'PLANIFICATION',
  executing: 'EXÉCUTION',
  observing: 'OBSERVATION',
  adapting: 'ADAPTATION',
};

interface CognitiveInterfaceProps {
  className?: string;
}

export function CognitiveInterface({ className }: CognitiveInterfaceProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const { push: notifyPush } = useNotifications();
  
  // === UTILISATION DU CERVEAU COGNITIF ===
  const { 
    messages, 
    schema, 
    thought,
    isLoading, 
    isStreaming, 
    error,
    pendingAction,
    aiProvider,
    aiModel,
    isLocalFallback,
    mentalState,
    activeTasks,
    sendMessage, 
    handleAction,
    confirmAction,
    reset 
  } = useCognitiveBrain(notifyPush);

  // === TTS INTEGRATION ===
  const tts = useCognitiveTTS({
    autoPlay: true,
    maxLength: 500,
    skipIfSpeaking: true,
  });

  // Auto-speak thoughts when they appear
  useEffect(() => {
    if (!thought || isStreaming || !tts.isEnabled) return;

    const firstTextBlock = schema?.blocks?.find(
      block => block.type === 'text' && typeof block.content === 'string'
    );

    // FIXED: Safe access to firstTextBlock properties
    const textToSpeak = 
      (firstTextBlock && firstTextBlock.type === 'text' && typeof firstTextBlock.content === 'string') 
        ? firstTextBlock.content 
        : thought;

    console.log(
      '[CognitiveInterface] Speaking:',
      textToSpeak.slice(0, 80)
    );

    tts.speakThought(textToSpeak);
  }, [thought, isStreaming, tts.isEnabled, schema]);


  // Détecter la première interaction
  useEffect(() => {
    if (messages.length > 0 && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [messages.length, hasInteracted]);

  useEffect(() => {
    if (pendingAction) {
      const actionType = pendingAction.payload.actionType as string;
      const value = pendingAction.payload.value || pendingAction.payload.item;
      
      if (actionType === 'list-select') {
        setInput(`J'ai sélectionné: "${value}". `);
      }
    }
  }, [pendingAction]);

  const layout = schema?.layout || {};
  const widthClass = widthClasses[layout.width || 'md'];
  const maxHeightClass = layout.maxHeight ? maxHeightClasses[layout.maxHeight] : '';
  const isScrollable = layout.scrollable !== false;
  const isCentered = layout.centered !== false;

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

  // Formatage du provider pour affichage
  const getProviderDisplay = () => {
    if (!aiProvider) return 'AI.STANDBY';
    const providerName = aiProvider.toUpperCase();
    const modelName = aiModel ? aiModel.split('/').pop()?.toUpperCase() : '';
    if (isLocalFallback) return `⚡ LOCAL:${modelName || providerName}`;
    return modelName ? `${providerName}:${modelName}` : providerName;
  };

  // Affichage du mode du cerveau
  const getBrainModeDisplay = () => {
    if (!mentalState) return null;
    return brainModeLabels[mentalState.mode] || mentalState.mode.toUpperCase();
  };

  // Affichage des tâches actives
  const getActiveTasksDisplay = () => {
    if (activeTasks.length === 0) return null;
    return `${activeTasks.length} TASK${activeTasks.length > 1 ? 'S' : ''}`;
  };

  return (
    <div className={cn(widthClass, isCentered && 'mx-auto', className)}>

      {/* Page d'accueil avant première interaction */}
      <AnimatePresence mode="wait">
        {!hasInteracted && !isLoading && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 text-center"
          >
            {/* Titre principal animé */}
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.span 
                className="inline-block text-[10px] uppercase tracking-[0.4em] text-intent-primary/60 mb-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                COGNITIVE INTERFACE • VOICE ENABLED
              </motion.span>
              
              <h1 className="text-3xl sm:text-4xl font-extralight tracking-[0.15em] text-text-primary mb-2">
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  NEURAL
                </motion.span>
                {' '}
                <motion.span
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-intent-primary"
                >
                  STREAM
                </motion.span>
              </h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-text-ghost font-light tracking-wide max-w-md mx-auto"
              >
                Interface cognitive avancée avec intelligence artificielle multi-modèle et synthèse vocale
              </motion.p>
            </motion.div>

            {/* Indicateurs de statut */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-6 text-[9px] text-text-ghost font-mono tracking-wider"
            >
              {/* Brain Mode */}
              <motion.div 
                className="flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-intent-secondary" />
                <span>BRAIN READY</span>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-intent-primary" />
                <span>ASYNC LOOP</span>
              </motion.div>
              
              {/* TTS indicator */}
              <motion.div 
                className="flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tts.isEnabled ? "bg-intent-success" : "bg-text-ghost/40"
                )} />
                <span>{tts.isEnabled ? "VOICE ACTIVE" : "VOICE OFF"}</span>
              </motion.div>
              
              {/* Indicateur Electron si disponible */}
              {typeof window !== 'undefined' && (window as unknown as { cognitiveBridge?: unknown }).cognitiveBridge && (
                <motion.div 
                  className="flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2.1 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-intent-focus" />
                  <span>SYSTEM BRIDGE</span>
                </motion.div>
              )}
            </motion.div>

            {/* Ligne décorative */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-intent-primary/40 to-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>

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
            <FuturisticFrame variant="primary" animated={isLoading || tts.isSpeaking}>
              <div className="p-6">
                {/* Header bar */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-intent-primary/20">
                  <div className="flex items-center gap-3">
                    <StateIndicator mode={getIndicatorMode()} size="sm" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                        {schema?.metadata?.title || getStateLabel()}
                      </span>
                      <span className="text-[9px] text-text-ghost tracking-wide max-w-[300px] truncate flex items-center gap-2" title={thought || undefined}>
                        {thought || schema?.metadata?.description || 'COGNITIVE.UI.v1.0'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Indicateur local fallback */}
                    {isLocalFallback && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[8px] text-intent-focus uppercase tracking-wider px-2 py-0.5 border border-intent-focus/30 bg-intent-focus/10"
                        style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
                      >
                        LOCAL
                      </motion.span>
                    )}
                    
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

                {/* Dynamic UI Schema */}
                {schema && (
                  <div 
                    className={cn(
                      'min-h-[60px]',
                      maxHeightClass,
                      isScrollable && 'overflow-y-auto overflow-x-hidden'
                    )}
                    style={{
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

                {/* Bottom data bar with Brain info */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-intent-primary/10">
                  <div className="flex items-center gap-4 text-[8px] text-text-ghost font-mono tracking-wide">
                    <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
                      MSG:{messages.length}
                    </motion.span>
                    
                    {/* Brain Mode Display */}
                    {getBrainModeDisplay() && (
                      <motion.span 
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={cn(
                          mentalState?.mode === 'thinking' && 'text-intent-primary',
                          mentalState?.mode === 'executing' && 'text-intent-focus',
                          mentalState?.mode === 'observing' && 'text-intent-secondary',
                        )}
                      >
                        🧠 {getBrainModeDisplay()}
                      </motion.span>
                    )}
                    
                    {/* Active Tasks */}
                    {getActiveTasksDisplay() && (
                      <motion.span 
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-intent-focus"
                      >
                        ⚙️ {getActiveTasksDisplay()}
                      </motion.span>
                    )}
                    
                    <motion.span 
                      animate={{ opacity: [0.5, 1, 0.5] }} 
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                      className={isLocalFallback ? 'text-intent-focus' : aiProvider ? 'text-intent-secondary' : ''}
                    >
                      {getProviderDisplay()}
                    </motion.span>
                    
                    {tts.isEnabled && (
                      <motion.span 
                        className={cn(
                          tts.isSpeaking ? 'text-intent-success' : 'text-text-ghost'
                        )}
                        animate={{ opacity: tts.isSpeaking ? [0.5, 1, 0.5] : 1 }} 
                        transition={{ duration: 1, repeat: tts.isSpeaking ? Infinity : 0 }}
                      >
                        {tts.isSpeaking ? '🔊' : '🔇'}
                      </motion.span>
                    )}
                    
                    {pendingAction && (
                      <motion.span 
                        className="text-intent-primary"
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        PENDING...
                      </motion.span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      reset();
                      setHasInteracted(false);
                      tts.stop();
                    }}
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
        transition={{ delay: hasInteracted ? 0 : 0.8 }}
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
                      : hasInteracted 
                        ? "Pose une question à l'IA..."
                        : "Que puis-je faire pour vous ?"
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