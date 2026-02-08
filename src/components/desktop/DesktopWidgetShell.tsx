import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import {
  NotificationProvider,
  NotificationQueue,
} from '@/components/cognitive';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import { useCognitiveEdgeTTS } from '@/hooks/useCognitiveEdgeTTS';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useFloatingCards } from '@/hooks/useFloatingCards';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useDesktopIcons } from '@/hooks/useDesktopIcons';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { BridgeIndicator } from './BridgeIndicator';
import { DesktopCommandBar } from './DesktopCommandBar';
import { FloatingResponseCard } from './FloatingResponseCard';
import { DesktopSidePanel } from './DesktopSidePanel';
import { DesktopIconZone } from './DesktopIconZone';

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
  const { play: playSound, setEnabled: setSoundEnabled, isEnabled: isSoundEnabled } = useSoundEffects();
  const floatingCards = useFloatingCards();
  const activeSchemaCardIdRef = useRef<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelTab, setPanelTab] = useState<'system' | 'settings'>('system');
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.75);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(isSoundEnabled());

  const metricsEnabled = false;
  const metricsInterval = panelCollapsed ? 8000 : panelTab === 'system' ? 2000 : 5000;
  const { metrics, isAvailable: isSystemAvailable } = useSystemMetrics({
    intervalMs: metricsInterval,
    enabled: metricsEnabled,
  });
  const desktopIcons = useDesktopIcons();

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
  const tts = useCognitiveEdgeTTS({ autoPlay: true, maxLength: 500, skipIfSpeaking: true });

  const voiceInput = useVoiceInput({
    onFinalTranscript: (text) => {
      if (!text.trim()) return;
      handleSend(text.trim());
    },
  });

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
  const lastSpokenRef = useRef<string | null>(null);
  const peakCooldownRef = useRef(0);

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

  // Sync sound toggle
  useEffect(() => {
    setSoundEnabled(soundsEnabled);
  }, [soundsEnabled, setSoundEnabled]);

  // Voice output: speak the first text block when a stable schema arrives
  useEffect(() => {
    if (!tts.isEnabled || !schema || isStreaming) return;
    if (schema.metadata?.isTransition) return;
    const firstTextBlock = schema.blocks?.find(
      block => block.type === 'text' && typeof block.content === 'string'
    ) as { content?: string } | undefined;
    const textToSpeak = firstTextBlock?.content?.trim();
    if (!textToSpeak || textToSpeak === lastSpokenRef.current) return;
    lastSpokenRef.current = textToSpeak;
    tts.speakThought(textToSpeak);
  }, [schema, isStreaming, tts]);

  // System peak detection → suggest performance mode
  useEffect(() => {
    if (!metricsEnabled) return;
    if (!metrics) return;
    const now = Date.now();
    if (now - peakCooldownRef.current < 60000) return;

    const cpu = metrics.cpu?.usage ?? 0;
    const mem = metrics.memory?.usage ?? 0;
    const gpu = metrics.gpu?.usage ?? 0;

    if (cpu > 85 || mem > 90 || gpu > 90) {
      peakCooldownRef.current = now;
      notifyPush({
        message: `Pic détecté — CPU ${cpu.toFixed(0)}% • RAM ${mem.toFixed(0)}%${gpu ? ` • GPU ${gpu.toFixed(0)}%` : ''}`,
        priority: 'high',
        dismissible: true,
        action: {
          label: 'Réduire la charge',
          onClick: () => {
            setReduceMotion(true);
            setSoundsEnabled(false);
          },
        },
      });
    }
  }, [metrics, notifyPush, metricsEnabled]);

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

  const handlePositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    floatingCards.updateCard(id, { position });
  }, [floatingCards]);

  // Click-through pour Electron
  const handleMouseState = (inside: boolean) => {
    const bridge = (window as Window & {
      cognitiveBridge?: { widgetMouseEnter?: () => void; widgetMouseLeave?: () => void };
    }).cognitiveBridge;
    if (!bridge) return;
    if (inside) {
      bridge.widgetMouseEnter?.();
    } else {
      bridge.widgetMouseLeave?.();
    }
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
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
      <NotificationQueue position="top-right" onMouseStateChange={handleMouseState} />

      {/* Bridge Indicator — coin inférieur droit */}
      <BridgeIndicator
        brainMode={brainMode}
        isAutonomous={isAutonomousMode}
        autonomyCount={autonomyActionCount}
        autonomyLimit={autonomyLimit}
        activeTasks={activeTasks.length}
        onMouseStateChange={handleMouseState}
        surfaceOpacity={surfaceOpacity}
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
              onPositionChange={handlePositionChange}
              onBringToFront={floatingCards.bringToFront}
              onMouseStateChange={handleMouseState}
              surfaceOpacity={surfaceOpacity}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop icons zone — gauche */}
      <DesktopIconZone
        icons={desktopIcons.icons}
        isLoading={desktopIcons.isLoading}
        error={desktopIcons.error}
        surfaceOpacity={surfaceOpacity}
        onMouseStateChange={handleMouseState}
      />

      {/* Side Panel — centre droit */}
      <DesktopSidePanel
        metrics={metrics}
        isAvailable={metricsEnabled && isSystemAvailable}
        isCollapsed={panelCollapsed}
        activeTab={panelTab}
        onToggleCollapse={() => setPanelCollapsed(prev => !prev)}
        onTabChange={setPanelTab}
        onMouseStateChange={handleMouseState}
        surfaceOpacity={surfaceOpacity}
        onSurfaceOpacityChange={setSurfaceOpacity}
        ttsEnabled={tts.isEnabled}
        onTtsToggle={tts.setEnabled}
        voiceInputEnabled={voiceInput.isEnabled}
        voiceInputSupported={voiceInput.isSupported}
        onVoiceInputToggle={voiceInput.setEnabled}
        soundsEnabled={soundsEnabled}
        onSoundsToggle={setSoundsEnabled}
        reduceMotion={reduceMotion}
        onReduceMotionToggle={setReduceMotion}
        onActivatePerformanceMode={() => {
          setReduceMotion(true);
          setSoundsEnabled(false);
        }}
      />

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
        surfaceOpacity={surfaceOpacity}
      />
      </>
    </MotionConfig>
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
