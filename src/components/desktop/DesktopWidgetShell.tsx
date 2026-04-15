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
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useDesktopIcons } from '@/hooks/useDesktopIcons';
import { usePersistentState } from '@/hooks/usePersistentState';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { BridgeIndicator } from './BridgeIndicator';
import { DesktopCommandBar } from './DesktopCommandBar';
import { FloatingResponseCard } from './FloatingResponseCard';
import { DesktopSidePanel } from './DesktopSidePanel';
import { DesktopIconZone } from './DesktopIconZone';
import { FileExplorer } from '@/components/explorer/FileExplorer';

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
 * DesktopWidgetShell — Bureau immersif type Big Picture
 * Même fond que la vue web, BridgeIndicator top-left, CommandBar Ctrl+K
 */
function DesktopWidgetShellInner() {
  const { push: notifyPush } = useNotifications();
  const brain = useCognitiveBrain(notifyPush);
  const { play: playSound, setEnabled: setSoundEnabled, isEnabled: isSoundEnabled } = useSoundEffects();
  const floatingCards = useFloatingCards();
  const activeSchemaCardIdRef = useRef<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerPath, setExplorerPath] = useState<string | undefined>();
  const [panelTab, setPanelTab] = useState<'system' | 'settings'>('settings');
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.85);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(isSoundEnabled());
  const [showDesktopApps, setShowDesktopApps] = usePersistentState('desktop:show-apps-widget', true);
  const [commandBarVisible, setCommandBarVisible] = useState(false);
  const [explorerIntegrationEnabled, setExplorerIntegrationEnabled] = useState(true);
  const [explorerIntegrationMode, setExplorerIntegrationMode] = useState<'global' | 'folders-only'>('global');
  const {
    isAvailable: isElectronBridgeAvailable,
    notifyExplorerReady,
    onExplorerOpenRequest,
    getExplorerSettings,
    setExplorerSettings,
  } = useSystemBridge();

  const desktopIcons = useDesktopIcons(showDesktopApps);

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

  const prevSchemaRef = useRef(schema);
  const prevErrorRef = useRef(error);
  const prevThoughtRef = useRef(thought);
  const prevIsLoadingRef = useRef(isLoading);
  const prevUserMessageCountRef = useRef(0);
  const lastSpokenRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      playSound('error');
      floatingCards.pushError(error);
    }
    prevErrorRef.current = error;
  }, [error, playSound, floatingCards]);

  useEffect(() => {
    if (thought && thought !== prevThoughtRef.current && thought.length > 20) {
      const clipped = thought.length > 160 ? `${thought.slice(0, 160)}…` : thought;
      notifyPush({ message: clipped, priority: 'low' });
    }
    prevThoughtRef.current = thought;
  }, [thought, notifyPush]);

  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      playSound('thinking');
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, playSound]);

  useEffect(() => {
    setSoundEnabled(soundsEnabled);
  }, [soundsEnabled, setSoundEnabled]);

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

  const handleSend = useCallback((msg: string) => {
    playSound('send');
    sendMessage(msg);
  }, [playSound, sendMessage]);

  const handleCardAction = useCallback((action: Parameters<typeof handleAction>[0]) => {
    playSound('action');
    handleAction(action);
  }, [playSound, handleAction]);

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

  const handleMouseState = (inside: boolean) => {
    const bridge = (window as Window & {
      cognitiveBridge?: { widgetMouseEnter?: () => void; widgetMouseLeave?: () => void };
    }).cognitiveBridge;
    if (!bridge) return;
    if (inside) bridge.widgetMouseEnter?.();
    else bridge.widgetMouseLeave?.();
  };

  useEffect(() => {
    if (!isElectronBridgeAvailable) return;

    getExplorerSettings().then((settings) => {
      setExplorerIntegrationEnabled(settings.explorerIntegrationEnabled);
      setExplorerIntegrationMode(settings.explorerIntegrationMode);
    });

    const unsubscribe = onExplorerOpenRequest(({ path }) => {
      setExplorerPath(path);
      setExplorerOpen(true);
    });

    notifyExplorerReady();
    return unsubscribe;
  }, [getExplorerSettings, isElectronBridgeAvailable, notifyExplorerReady, onExplorerOpenRequest]);

  const syncExplorerSettings = useCallback(async (updates: Partial<{ explorerIntegrationEnabled: boolean; explorerIntegrationMode: 'global' | 'folders-only' }>) => {
    const next = await setExplorerSettings({
      explorerIntegrationEnabled: updates.explorerIntegrationEnabled ?? explorerIntegrationEnabled,
      explorerIntegrationMode: updates.explorerIntegrationMode ?? explorerIntegrationMode,
    });
    setExplorerIntegrationEnabled(next.explorerIntegrationEnabled);
    setExplorerIntegrationMode(next.explorerIntegrationMode);
  }, [explorerIntegrationEnabled, explorerIntegrationMode, setExplorerSettings]);

  const toggleCommandBar = useCallback(() => {
    setCommandBarVisible(prev => !prev);
  }, []);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <>
      {/* Dialogs */}
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

      {/* Bridge Indicator — top-left */}
      <BridgeIndicator
        brainMode={brainMode}
        isAutonomous={isAutonomousMode}
        autonomyCount={autonomyActionCount}
        autonomyLimit={autonomyLimit}
        activeTasks={activeTasks.length}
        onMouseStateChange={handleMouseState}
      />

      {/* Floating Response Cards — centre */}
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

      {/* Desktop icons zone */}
      {showDesktopApps && (
        <DesktopIconZone
          icons={desktopIcons.icons}
          isLoading={desktopIcons.isLoading}
          error={desktopIcons.error}
          surfaceOpacity={surfaceOpacity}
          onMouseStateChange={handleMouseState}
          onOpenExplorer={(path) => { setExplorerPath(path); setExplorerOpen(true); }}
        />
      )}

      {/* File Explorer */}
      <AnimatePresence>
        {explorerOpen && (
          <FileExplorer
            initialPath={explorerPath}
            onClose={() => setExplorerOpen(false)}
            onMouseStateChange={handleMouseState}
            surfaceOpacity={surfaceOpacity}
          />
        )}
      </AnimatePresence>

      {/* Side Panel */}
      <DesktopSidePanel
        metrics={null}
        isAvailable={false}
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
        showDesktopApps={showDesktopApps}
        onShowDesktopAppsToggle={setShowDesktopApps}
        explorerIntegrationEnabled={explorerIntegrationEnabled}
        onExplorerIntegrationEnabledChange={(value) => {
          setExplorerIntegrationEnabled(value);
          void syncExplorerSettings({
            explorerIntegrationEnabled: value,
            explorerIntegrationMode: value ? 'global' : 'folders-only',
          });
        }}
        explorerIntegrationMode={explorerIntegrationMode}
        onExplorerIntegrationModeChange={(value) => {
          setExplorerIntegrationMode(value);
          void syncExplorerSettings({
            explorerIntegrationEnabled: true,
            explorerIntegrationMode: value,
          });
        }}
        onActivatePerformanceMode={() => {
          setReduceMotion(true);
          setSoundsEnabled(false);
        }}
      />

      {/* Command Bar — hidden by default, Ctrl+K to show */}
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
        visible={commandBarVisible}
        onToggleVisible={toggleCommandBar}
      />
      </>
    </MotionConfig>
  );
}

export function DesktopWidgetShell() {
  return (
    <NotificationProvider>
      {/* Immersive desktop — same background as web, no transparent overlay */}
      <div className="fixed inset-0">
        {/* Ambient background identical to web */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
        </div>
        <DesktopWidgetShellInner />
      </div>
    </NotificationProvider>
  );
}
