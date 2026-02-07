import { useMemo, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  NotificationProvider,
  NotificationQueue,
} from '@/components/cognitive';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import { useCognitiveEdgeTTS } from '@/hooks/useCognitiveEdgeTTS';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useFloatingCards } from '@/hooks/useFloatingCards';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { BridgeIndicator } from './BridgeIndicator';
import { DesktopCommandBar } from './DesktopCommandBar';
import { FloatingResponseCard } from './FloatingResponseCard';

// Mapping des modes du cerveau
const brainModeLabels: Record<string, string> = {
  idle: 'VEILLE',
  listening: 'ÉCOUTE',
  thinking: 'RÉFLEXION',
  planning: 'PLANIFICATION',
  executing: 'EXÉCUTION',
  observing: 'OBSERVATION',
  adapting: 'ADAPTATION',
};

/**
 * DesktopWidgetShell — Layout de widgets bureau
 * - BridgeIndicator en bas-droit
 * - Cartes flottantes au centre
 * - Barre de commande en bas-centre
 */
function DesktopWidgetShellInner() {
  const { push: notifyPush } = useNotifications();
  const brain = useCognitiveBrain(notifyPush);
  const { play: playSound } = useSoundEffects();
  const floatingCards = useFloatingCards();
  const activeSchemaCardIdRef = useRef<string | null>(null);

  const {
    messages,
    schema,
    thought,
    isLoading,
    isStreaming,
    error,
    pendingAction,
    pendingConfirmation,
    pendingQuestion,
    aiProvider,
    aiModel,
    isLocalFallback,
    mentalState,
    activeTasks,
    isAutonomousMode,
    autonomyActionCount,
    autonomyLimit,
    sendMessage,
    handleAction,
    confirmAction,
    respondToConfirmation,
    respondToQuestion,
    reset,
  } = brain;

  // TTS
  useCognitiveEdgeTTS({ autoPlay: true, maxLength: 500, skipIfSpeaking: true });

  const brainMode = useMemo(() => {
    if (!mentalState) return null;
    return brainModeLabels[mentalState.mode] || mentalState.mode.toUpperCase();
  }, [mentalState]);

  // Track previous states to detect transitions
  const prevSchemaRef = useRef(schema);
  const prevErrorRef = useRef(error);
  const prevThoughtRef = useRef(thought);
  const prevIsLoadingRef = useRef(isLoading);
  const prevUserMessageCountRef = useRef(0);

  const userMessageCount = useMemo(
    () => messages.filter(message => message.role === 'user').length,
    [messages],
  );

  useEffect(() => {
    if (userMessageCount > prevUserMessageCountRef.current) {
      activeSchemaCardIdRef.current = null;
    }
    prevUserMessageCountRef.current = userMessageCount;
  }, [userMessageCount]);

  // React to schema changes → push floating card
  useEffect(() => {
    if (schema && schema !== prevSchemaRef.current) {
      if (activeSchemaCardIdRef.current) {
        floatingCards.updateCard(activeSchemaCardIdRef.current, {
          type: 'response',
          schema,
          text: undefined,
          error: undefined,
          autoDismissMs: 0,
          timestamp: Date.now(),
        });
      } else {
        playSound('cardAppear');
        const cardId = floatingCards.pushSchema(schema);
        activeSchemaCardIdRef.current = cardId;
      }
    }
    prevSchemaRef.current = schema;
  }, [schema, playSound, floatingCards]);

  // React to errors → push error card
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      playSound('error');
      floatingCards.pushError(error);
    }
    prevErrorRef.current = error;
  }, [error, playSound, floatingCards]);

  // React to thought changes → notify instead of rendering cards
  useEffect(() => {
    if (thought && thought !== prevThoughtRef.current && thought.length > 20) {
      const clipped = thought.length > 160 ? `${thought.slice(0, 160)}…` : thought;
      notifyPush({ message: clipped, priority: 'low' });
    }
    prevThoughtRef.current = thought;
  }, [thought, notifyPush]);

  // Sound when loading starts
  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      playSound('thinking');
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, playSound]);

  // Wrapped sendMessage with sound
  const handleSend = useCallback((msg: string) => {
    playSound('send');
    sendMessage(msg);
  }, [playSound, sendMessage]);

  // Wrapped action with sound
  const handleCardAction = useCallback((action: Parameters<typeof handleAction>[0]) => {
    playSound('action');
    handleAction(action);
  }, [playSound, handleAction]);

  // Wrapped dismiss with sound
  const handleDismiss = useCallback((id: string) => {
    playSound('cardDismiss');
    if (activeSchemaCardIdRef.current === id) {
      activeSchemaCardIdRef.current = null;
    }
    floatingCards.dismissCard(id);
  }, [playSound, floatingCards]);

  // Click-through pour Electron
  const handleMouseState = (inside: boolean) => {
    const bridge = (window as any).cognitiveBridge;
    if (!bridge) return;
    if (inside) {
      bridge.widgetMouseEnter?.();
    } else {
      bridge.widgetMouseLeave?.();
    }
  };

  return (
    <>
      {/* Dialogs (toujours au premier plan) */}
      <AutonomyConfirmDialog
        open={Boolean(pendingConfirmation)}
        action={pendingConfirmation?.action}
        description={pendingConfirmation?.description}
        onCancel={() => respondToConfirmation(false)}
        onConfirm={() => respondToConfirmation(true)}
      />
      <AutonomyQuestionDialog
        open={Boolean(pendingQuestion)}
        question={pendingQuestion?.question}
        onCancel={() => respondToQuestion('')}
        onSubmit={respondToQuestion}
      />

      {/* Notifications */}
      <NotificationQueue position="top-right" />

      {/* Bridge Indicator — coin inférieur droit */}
      <BridgeIndicator
        brainMode={brainMode}
        isAutonomous={isAutonomousMode}
        autonomyCount={autonomyActionCount}
        autonomyLimit={autonomyLimit}
        activeTasks={activeTasks.length}
        onMouseStateChange={handleMouseState}
      />

      {/* Floating Response Cards — centre de l'écran */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <AnimatePresence mode="popLayout">
          {floatingCards.cards.map((card) => (
            <FloatingResponseCard
              key={card.id}
              card={card}
              onDismiss={handleDismiss}
              onAction={handleCardAction}
              onPositionChange={(id, position) => floatingCards.updateCard(id, { position })}
              onBringToFront={floatingCards.bringToFront}
              onMouseStateChange={handleMouseState}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Command Bar — bas-centre */}
      <DesktopCommandBar
        onSend={handleSend}
        onConfirmAction={confirmAction}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        pendingAction={pendingAction}
        aiProvider={aiProvider}
        aiModel={aiModel}
        isLocalFallback={isLocalFallback}
        brainMode={brainMode}
        messageCount={messages.length}
        onMouseStateChange={handleMouseState}
      />
    </>
  );
}

export function DesktopWidgetShell() {
  return (
    <NotificationProvider>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'transparent' }}>
        <div className="pointer-events-auto">
          <DesktopWidgetShellInner />
        </div>
      </div>
    </NotificationProvider>
  );
}
