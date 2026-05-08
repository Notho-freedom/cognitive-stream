import { useMemo, useEffect, useRef, useCallback, useState, memo } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import {
  NotificationProvider,
  NotificationQueue,
  LoadingScreen,
} from '@/components/cognitive';
import { useNotifications } from '@/components/cognitive/NotificationQueue';
import { useCognitiveBrain } from '@/hooks/useCognitiveBrain';
import { useCognitiveEdgeTTS } from '@/hooks/useCognitiveEdgeTTS';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useSound } from '@/hooks/useSound';
import { useFloatingCards } from '@/hooks/useFloatingCards';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useDesktopIcons } from '@/hooks/useDesktopIcons';
import { useCogWindowManager } from '@/hooks/useCogWindowManager';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useSettings, getWallpaperBackground } from '@/hooks/useSettings';
import { useIconScale } from '@/hooks/useIconScale';
import { useWallpaperSlideshow } from '@/hooks/useWallpaper';
import { useFocusManager } from '@/hooks/useFocusManager';
import { useStableCallback } from '@/hooks/useStableCallback';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { DesktopTaskbar } from './DesktopTaskbar';
import { DesktopCommandBar } from './DesktopCommandBar';
import { FloatingResponseCard } from './FloatingResponseCard';
import { DesktopIconsLayer } from './DesktopIconsLayer';
import { DesktopAmbient } from './DesktopAmbient';
import { CogContextMenu } from './CogContextMenu';
import { CognitiveTestPanel } from './CognitiveTestPanel';
import { CogWindow } from './CogWindow';
import { AIActivityOrb } from './AIActivityOrb';
import { FileExplorer } from '@/components/explorer';
import { TerminalWindow } from './TerminalWindow';
import { WindowSwitcher } from './WindowSwitcher';
import { DesktopErrorBoundary, GlobalErrorTracer } from './ErrorBoundary';
import { useNavigate } from 'react-router-dom';

const brainModeLabels: Record<string, string> = {
  idle: 'VEILLE',
  listening: 'ÉCOUTE',
  thinking: 'RÉFLEXION',
  planning: 'PLANIFICATION',
  executing: 'EXÉCUTION',
  observing: 'OBSERVATION',
  adapting: 'ADAPTATION',
};

const TASKBAR_HEIGHT = 40;

function DesktopWidgetShellInner() {
  const { push: notifyPush } = useNotifications();
  const { settings, update } = useSettings();
  const brain = useCognitiveBrain(notifyPush);
  const { play: playSound, setEnabled: setSoundEnabled } = useSoundEffects();
  const { play: playSfx } = useSound();
  const floatingCards = useFloatingCards();
  const cogWindows = useCogWindowManager();
  const desktopCtxMenu = useContextMenu();
  const focusManager = useFocusManager();
  const navigate = useNavigate();

  // Register icon scale (Ctrl+scroll)
  useIconScale();

  const activeSchemaCardIdRef = useRef<string | null>(null);
  const [commandBarVisible, setCommandBarVisible] = useState(false);

  useEffect(() => { setSoundEnabled(settings.soundsEnabled); }, [settings.soundsEnabled, setSoundEnabled]);

  const { isAvailable: isElectronBridgeAvailable } = useSystemBridge();
  const desktopIcons = useDesktopIcons(true);

  const {
    messages, schema, thought, isLoading, isStreaming, error,
    pendingAction, pendingConfirmation, pendingQuestion,
    aiProvider, aiModel, isLocalFallback, mentalState,
    activeTasks, isAutonomousMode, autonomyActionCount, autonomyLimit,
    sendMessage, handleAction, confirmAction, respondToConfirmation, respondToQuestion,
  } = brain;

  const tts = useCognitiveEdgeTTS({ autoPlay: settings.ttsEnabled, maxLength: 500, skipIfSpeaking: true });

  const handleSendRef = useRef<(msg: string) => void>(() => {});
  const voiceInput = useVoiceInput({
    onFinalTranscript: useStableCallback((text: string) => {
      const trimmed = text.trim();
      if (trimmed) handleSendRef.current(trimmed);
    }),
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
          type: 'response', schema, text: undefined, error: undefined, timestamp: Date.now(),
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
    if (isLoading && !prevIsLoadingRef.current) playSound('thinking');
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, playSound]);

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

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  const handleCardAction = useStableCallback((action: Parameters<typeof handleAction>[0]) => {
    playSound('action');
    handleAction(action);
  });

  const handleDismiss = useStableCallback((id: string) => {
    playSound('cardDismiss');
    if (activeSchemaCardIdRef.current === id) activeSchemaCardIdRef.current = null;
    floatingCards.dismissCard(id);
  });

  const handlePositionChange = useStableCallback((id: string, position: { x: number; y: number }) => {
    floatingCards.updateCard(id, { position });
  });

  const toggleCommandBar = useCallback(() => setCommandBarVisible(prev => !prev), []);

  // --- Open explorer as CogWindow ---
  const openExplorer = useCallback((path?: string) => {
    playSfx('open');
    cogWindows.open('explorer', 'EXPLORATEUR', { size: { width: 1000, height: 700 } });
  }, [playSfx, cogWindows]);

  // --- Open terminal as CogWindow ---
  const openTerminal = useCallback(() => {
    playSfx('open');
    cogWindows.open('terminal', 'TERMINAL', { size: { width: 700, height: 420 } });
  }, [playSfx, cogWindows]);

  const desktopCommands = useMemo(() => ({
    'open explorer': () => openExplorer(),
    'open terminal': () => openTerminal(),
    'open settings': () => navigate('/settings'),
    'open tests': () => cogWindows.open('tests', 'PANEL DE TEST', { size: { width: 480, height: 600 } }),
    'clear': () => floatingCards.dismissAll(),
    'close all': () => { floatingCards.dismissAll(); cogWindows.windows.forEach(w => cogWindows.close(w.id)); },
    'focus terminal': () => setCommandBarVisible(true),
  }), [navigate, cogWindows, floatingCards, openExplorer, openTerminal]);

  const handleCommandSend = useStableCallback((msg: string) => {
    const lower = msg.toLowerCase().trim();
    const cmd = Object.entries(desktopCommands).find(([k]) => lower === k || lower.startsWith(k + ' '));
    if (cmd) { cmd[1](); return; }
    handleSend(msg);
  });

  const radialItems = useMemo(() => [
    { label: 'Explorateur', icon: '📁', onClick: () => openExplorer() },
    { label: 'Terminal', icon: '⌘', onClick: () => openTerminal() },
    { label: 'Tests', icon: '⊛', onClick: () => cogWindows.open('tests', 'PANEL DE TEST', { size: { width: 480, height: 600 } }) },
    { label: 'Paramètres', icon: '⚙', onClick: () => navigate('/settings') },
    { label: 'Quitter', icon: '✕', danger: true, onClick: () => { (window as any).electron?.app?.quit?.(); } },
  ], [cogWindows, navigate, openExplorer, openTerminal]);

  const desktopMenuItems = useMemo(() => [
    { label: 'Actualiser', icon: '↻', onClick: () => desktopIcons.refresh() },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Explorateur', icon: '📁', onClick: () => openExplorer() },
    { label: 'Terminal', icon: '⌘', onClick: () => openTerminal() },
    { label: 'Terminal IA', icon: '▸', onClick: () => setCommandBarVisible(true) },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Nouveau dossier', icon: '+', onClick: () => {} },
    { label: 'Trier par nom', icon: 'A', onClick: () => {} },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Personnaliser', icon: '⚙', onClick: () => navigate('/settings') },
  ], [desktopIcons, navigate, openExplorer, openTerminal]);

  // Sound on window open/close
  const handleWindowClose = useCallback((id: string) => {
    playSfx('close');
    cogWindows.close(id);
  }, [playSfx, cogWindows]);

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>
      <>
        <GlobalErrorTracer />
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

        <NotificationQueue position="top-right" />

        {/* Ambient (particles, scanline, ripples) */}
        <DesktopAmbient disabled={settings.reduceMotion || !settings.animationsEnabled} />

        {/* AI Activity Orb - visible thinking/speaking */}
        <AIActivityOrb
          mode={mentalState?.mode ?? 'idle'}
          thought={thought}
          isLoading={isLoading}
          isStreaming={isStreaming}
          disabled={settings.reduceMotion}
        />

        {/* Desktop icons */}
        <DesktopIconsLayer
          icons={desktopIcons.icons}
          iconImages={desktopIcons.iconImages}
          onResolveImage={desktopIcons.setIconImage}
          onOpenFolder={openExplorer}
          scale={settings.iconScale}
          onDesktopContextMenu={(e) => desktopCtxMenu.openMenu(e, desktopMenuItems)}
        />

        {/* Floating Response Cards */}
        <div className="fixed inset-0 pointer-events-none z-40" style={{ bottom: TASKBAR_HEIGHT }}>
          <AnimatePresence mode="popLayout">
            {floatingCards.cards.map((card) => (
              <FloatingResponseCard
                key={card.id}
                card={card}
                onDismiss={handleDismiss}
                onAction={handleCardAction}
                onPositionChange={handlePositionChange}
                onBringToFront={floatingCards.bringToFront}
                surfaceOpacity={settings.surfaceOpacity}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* CogWindows */}
        <div className="fixed inset-0 pointer-events-none z-30" style={{ bottom: TASKBAR_HEIGHT }}>
          <AnimatePresence>
            {cogWindows.windows.map((win) => (
              <CogWindow
                key={win.id}
                window={win}
                onClose={handleWindowClose}
                onFocus={cogWindows.focus}
                onMinimize={cogWindows.minimize}
                onMaximize={cogWindows.maximize}
                onPositionChange={cogWindows.updatePosition}
              >
                {win.type === 'tests' && (
                  <DesktopErrorBoundary label="TESTS">
                    <div className="p-4 h-full overflow-auto">
                      <CognitiveTestPanel
                        onPushSchema={(s) => floatingCards.pushSchema(s)}
                        onPushError={(m) => floatingCards.pushError(m)}
                        onPushThought={(t) => floatingCards.pushThought(t)}
                      />
                    </div>
                  </DesktopErrorBoundary>
                )}
                {win.type === 'explorer' && (
                  <DesktopErrorBoundary label="EXPLORATEUR">
                    <FileExplorer
                      embeddedMode="cognitive-stream"
                      onClose={() => handleWindowClose(win.id)}
                      className="h-full"
                      showWindowChrome={false}
                    />
                  </DesktopErrorBoundary>
                )}
                {win.type === 'terminal' && (
                  <DesktopErrorBoundary label="TERMINAL">
                    <TerminalWindow onClose={() => handleWindowClose(win.id)} />
                  </DesktopErrorBoundary>
                )}
              </CogWindow>
            ))}
          </AnimatePresence>
        </div>

        {/* Taskbar */}
        <DesktopTaskbar
          brainMode={brainMode}
          isAutonomous={isAutonomousMode}
          autonomyCount={autonomyActionCount}
          autonomyLimit={autonomyLimit}
          activeTasks={activeTasks.length}
          windows={cogWindows.windows}
          onFocusWindow={cogWindows.focus}
          onMinimizeWindow={cogWindows.minimize}
          onCloseWindow={handleWindowClose}
          radialItems={radialItems}
          onToggleCommandBar={toggleCommandBar}
          isLoading={isLoading}
          isStreaming={isStreaming}
        />

        {/* Command Bar */}
        <DesktopCommandBar
          onSend={handleCommandSend}
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
          visible={commandBarVisible}
          onToggleVisible={toggleCommandBar}
        />

        {/* Desktop context menu */}
        <CogContextMenu
          open={desktopCtxMenu.menu.open}
          x={desktopCtxMenu.menu.x}
          y={desktopCtxMenu.menu.y}
          items={desktopCtxMenu.menu.items}
          onClose={desktopCtxMenu.close}
        />

        {/* Alt+Tab window switcher */}
        <WindowSwitcher
          windows={cogWindows.windows}
          onSelect={(id) => cogWindows.focus(id)}
          onClose={() => {}}
        />
      </>
    </MotionConfig>
  );
}

export function DesktopWidgetShell() {
  const [booting, setBooting] = useState(true);
  return (
    <NotificationProvider>
      {booting && <LoadingScreen onComplete={() => setBooting(false)} minDuration={2500} />}
      <DesktopBackground booting={booting} />
    </NotificationProvider>
  );
}

function DesktopBackground({ booting }: { booting: boolean }) {
  const { settings } = useSettings();
  const { currentImage } = useWallpaperSlideshow();

  // Determine background
  const bg = useMemo(() => {
    if (settings.wallpaperPreset === 'slideshow' && currentImage) {
      return `url("${currentImage}") center/cover no-repeat, hsl(220 20% 4%)`;
    }
    return getWallpaperBackground(settings);
  }, [settings, currentImage]);

  return (
    <div
      className="fixed inset-0 transition-[background] duration-1000"
      style={{ background: bg }}
    >
      {!booting && (
        <DesktopErrorBoundary>
          <DesktopWidgetShellInner />
        </DesktopErrorBoundary>
      )}
    </div>
  );
}
