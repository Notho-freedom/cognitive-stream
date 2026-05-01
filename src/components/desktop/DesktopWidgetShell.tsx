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
import { useFloatingCards } from '@/hooks/useFloatingCards';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useDesktopIcons } from '@/hooks/useDesktopIcons';
import { useCogWindowManager } from '@/hooks/useCogWindowManager';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useSettings, getWallpaperBackground } from '@/hooks/useSettings';
import { useFocusManager } from '@/hooks/useFocusManager';
import { useStableCallback } from '@/hooks/useStableCallback';
import { AutonomyConfirmDialog } from '@/components/cognitive/AutonomyConfirmDialog';
import { AutonomyQuestionDialog } from '@/components/cognitive/AutonomyQuestionDialog';
import { DesktopTaskbar } from './DesktopTaskbar';
import { DesktopCommandBar } from './DesktopCommandBar';
import { FloatingResponseCard } from './FloatingResponseCard';
import { DesktopSidePanel } from './DesktopSidePanel';
import { DesktopIconsLayer } from './DesktopIconsLayer';
import { DesktopAmbient } from './DesktopAmbient';
import { CogContextMenu } from './CogContextMenu';
import { CognitiveTestPanel } from './CognitiveTestPanel';
import { CogWindow } from './CogWindow';
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

const TASKBAR_HEIGHT = 44;

function DesktopWidgetShellInner() {
  const { push: notifyPush } = useNotifications();
  const { settings, update } = useSettings();
  const brain = useCognitiveBrain(notifyPush);
  const { play: playSound, setEnabled: setSoundEnabled } = useSoundEffects();
  const floatingCards = useFloatingCards();
  const cogWindows = useCogWindowManager();
  const desktopCtxMenu = useContextMenu();
  const focusManager = useFocusManager();
  const navigate = useNavigate();

  const activeSchemaCardIdRef = useRef<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [explorerPath, setExplorerPath] = useState<string | undefined>();
  const [explorerOpenSource, setExplorerOpenSource] = useState<'shell' | 'widget' | 'internal'>('internal');
  const [explorerOpenToken, setExplorerOpenToken] = useState(0);
  const [commandBarVisible, setCommandBarVisible] = useState(false);
  const [explorerTakeoverState, setExplorerTakeoverState] = useState<'native' | 'armed' | 'restoring' | 'degraded'>('native');

  // Sync sound state from settings
  useEffect(() => { setSoundEnabled(settings.soundsEnabled); }, [settings.soundsEnabled, setSoundEnabled]);

  const {
    isAvailable: isElectronBridgeAvailable,
    notifyExplorerReady,
    onExplorerOpenRequest,
    getExplorerSettings,
    setExplorerSettings,
  } = useSystemBridge();

  const desktopIcons = useDesktopIcons(true);

  const {
    messages, schema, thought, isLoading, isStreaming, error,
    pendingAction, pendingConfirmation, pendingQuestion,
    aiProvider, aiModel, isLocalFallback, mentalState,
    activeTasks, isAutonomousMode, autonomyActionCount, autonomyLimit,
    sendMessage, handleAction, confirmAction, respondToConfirmation, respondToQuestion,
  } = brain;

  const tts = useCognitiveEdgeTTS({ autoPlay: settings.ttsEnabled, maxLength: 500, skipIfSpeaking: true });

  // Stable ref-based callback for voice input — prevents loop
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

  const openExplorer = useCallback((path?: string, source: 'shell' | 'widget' | 'internal' = 'internal') => {
    setExplorerPath(path);
    setExplorerOpenSource(source);
    setExplorerOpenToken((prev) => prev + 1);
    cogWindows.open('explorer', 'EXPLORATEUR', {
      size: { width: Math.min(1200, window.innerWidth * 0.8), height: Math.min(700, window.innerHeight * 0.8) },
    });
  }, [cogWindows]);

  // Stable refs to avoid loops in the bridge subscription effect
  const openExplorerRef = useRef(openExplorer);
  useEffect(() => { openExplorerRef.current = openExplorer; }, [openExplorer]);
  const getExplorerSettingsRef = useRef(getExplorerSettings);
  useEffect(() => { getExplorerSettingsRef.current = getExplorerSettings; }, [getExplorerSettings]);
  const onExplorerOpenRequestRef = useRef(onExplorerOpenRequest);
  useEffect(() => { onExplorerOpenRequestRef.current = onExplorerOpenRequest; }, [onExplorerOpenRequest]);
  const notifyExplorerReadyRef = useRef(notifyExplorerReady);
  useEffect(() => { notifyExplorerReadyRef.current = notifyExplorerReady; }, [notifyExplorerReady]);

  useEffect(() => {
    if (!isElectronBridgeAvailable) return;
    let disposed = false;
    getExplorerSettingsRef.current().then((s) => {
      if (disposed) return;
      update('explorerTakeoverEnabled', s.explorerTakeoverEnabled);
      setExplorerTakeoverState(s.explorerTakeoverState);
    });
    const unsubscribe = onExplorerOpenRequestRef.current(({ path, source }) => {
      openExplorerRef.current(path, source === 'shell' ? 'shell' : 'internal');
    });
    notifyExplorerReadyRef.current();
    return () => { disposed = true; unsubscribe?.(); };
  }, [isElectronBridgeAvailable, update]);

  const syncExplorerSettings = useCallback(async (updates: Partial<{ explorerTakeoverEnabled: boolean }>) => {
    const next = await setExplorerSettings({
      explorerTakeoverEnabled: updates.explorerTakeoverEnabled ?? settings.explorerTakeoverEnabled,
    });
    update('explorerTakeoverEnabled', next.explorerTakeoverEnabled);
    setExplorerTakeoverState(next.explorerTakeoverState);
  }, [settings.explorerTakeoverEnabled, setExplorerSettings, update]);

  const toggleCommandBar = useCallback(() => setCommandBarVisible(prev => !prev), []);

  // Desktop command system — CommandBar can dispatch these
  const desktopCommands = useMemo(() => ({
    'open explorer': () => openExplorer(),
    'open settings': () => navigate('/settings'),
    'open tests': () => cogWindows.open('tests', 'PANEL DE TEST', { size: { width: 480, height: 600 } }),
    'clear': () => floatingCards.dismissAll(),
    'close all': () => { floatingCards.dismissAll(); cogWindows.windows.forEach(w => cogWindows.close(w.id)); },
    'focus terminal': () => setCommandBarVisible(true),
  }), [openExplorer, navigate, cogWindows, floatingCards]);

  const handleCommandSend = useStableCallback((msg: string) => {
    // Check for desktop commands first
    const lower = msg.toLowerCase().trim();
    const cmd = Object.entries(desktopCommands).find(([k]) => lower === k || lower.startsWith(k + ' '));
    if (cmd) {
      cmd[1]();
      return;
    }
    handleSend(msg);
  });

  const radialItems = useMemo(() => [
    { label: 'Explorateur', icon: '◇', onClick: () => openExplorer() },
    { label: 'Terminal', icon: '⌘', onClick: () => setCommandBarVisible(true) },
    { label: 'Tests', icon: '⊛', onClick: () => cogWindows.open('tests', 'PANEL DE TEST', { size: { width: 480, height: 600 } }) },
    { label: 'Activité', icon: '≡', onClick: () => setPanelCollapsed(false) },
    { label: 'Paramètres', icon: '⚙', onClick: () => navigate('/settings') },
    { label: 'Quitter', icon: '✕', danger: true, onClick: () => { (window as any).electron?.app?.quit?.(); } },
  ], [openExplorer, cogWindows, navigate]);

  const desktopMenuItems = useMemo(() => [
    { label: 'Actualiser', icon: '↻', onClick: () => desktopIcons.refresh() },
    { label: 'Ouvrir explorateur', icon: '◇', onClick: () => openExplorer() },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Terminal IA', icon: '⌘', onClick: () => setCommandBarVisible(true) },
    { label: 'Nouveau dossier', icon: '+', onClick: () => {} },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Trier par nom', icon: 'A', onClick: () => {} },
    { label: 'Personnaliser', icon: '⚙', onClick: () => navigate('/settings') },
  ], [desktopIcons, openExplorer, navigate]);

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>
      <>
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

        {/* Desktop icons */}
        <DesktopIconsLayer
          icons={desktopIcons.icons}
          iconImages={desktopIcons.iconImages}
          onResolveImage={desktopIcons.setIconImage}
          onOpenFolder={(path) => openExplorer(path, 'widget')}
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
                onClose={cogWindows.close}
                onFocus={cogWindows.focus}
                onMinimize={cogWindows.minimize}
                onMaximize={cogWindows.maximize}
                onPositionChange={cogWindows.updatePosition}
              >
                {win.type === 'explorer' && (
                  <FileExplorerEmbedded
                    initialPath={explorerPath}
                    openSource={explorerOpenSource}
                    openToken={explorerOpenToken}
                    onClose={() => cogWindows.close(win.id)}
                  />
                )}
                {win.type === 'tests' && (
                  <div className="p-4 h-full overflow-auto">
                    <CognitiveTestPanel
                      onPushSchema={(s) => floatingCards.pushSchema(s)}
                      onPushError={(m) => floatingCards.pushError(m)}
                      onPushThought={(t) => floatingCards.pushThought(t)}
                      onOpenExplorer={(p) => openExplorer(p, 'internal')}
                    />
                  </div>
                )}
              </CogWindow>
            ))}
          </AnimatePresence>
        </div>

        {/* Side Panel — Activity */}
        <DesktopSidePanel
          isCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(prev => !prev)}
          activeCardCount={floatingCards.cards.length}
          onDismissAllCards={() => floatingCards.dismissAll()}
        />

        {/* Taskbar with radial menu */}
        <DesktopTaskbar
          brainMode={brainMode}
          isAutonomous={isAutonomousMode}
          autonomyCount={autonomyActionCount}
          autonomyLimit={autonomyLimit}
          activeTasks={activeTasks.length}
          windows={cogWindows.windows}
          onFocusWindow={cogWindows.focus}
          onMinimizeWindow={cogWindows.minimize}
          radialItems={radialItems}
          onToggleCommandBar={toggleCommandBar}
          onTogglePanel={() => setPanelCollapsed(prev => !prev)}
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
      </>
    </MotionConfig>
  );
}

const FileExplorerEmbedded = memo(function FileExplorerEmbedded({
  initialPath, openSource, openToken, onClose,
}: {
  initialPath?: string;
  openSource: 'shell' | 'widget' | 'internal';
  openToken: number;
  onClose: () => void;
}) {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/3 h-[600px] w-[600px] rounded-full bg-intent-primary/3 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 h-[400px] w-[400px] rounded-full bg-intent-secondary/3 blur-[100px]" />
      </div>
      <div className="relative z-10 h-full">
        <FileExplorerInner
          initialPath={initialPath}
          openSource={openSource}
          openToken={openToken}
          onClose={onClose}
        />
      </div>
    </div>
  );
});

import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useSoundEffects as useSfx } from '@/hooks/useSoundEffects';
import { FileExplorerToolbar } from '@/components/explorer/FileExplorerToolbar';
import { FileExplorerSidebar } from '@/components/explorer/FileExplorerSidebar';
import { FileExplorerBreadcrumb } from '@/components/explorer/FileExplorerBreadcrumb';
import { FileExplorerContent } from '@/components/explorer/FileExplorerContent';
import { FileExplorerPreview } from '@/components/explorer/FileExplorerPreview';
import { FileExplorerContextMenu } from '@/components/explorer/FileExplorerContextMenu';
import { FileExplorerStatusBar } from '@/components/explorer/FileExplorerStatusBar';
import { FileExplorerHomeContent } from '@/components/explorer/FileExplorerHomeContent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import type { FileEntity } from '@/types/explorer.types';
import { QUICK_ACCESS_PATHS } from '@/types/explorer.types';

const FileExplorerInner = memo(function FileExplorerInner({
  initialPath, openToken,
}: {
  initialPath?: string;
  openSource: string;
  openToken: number;
  onClose: () => void;
}) {
  const explorer = useFileExplorer(initialPath);
  const navigateTo = explorer.navigateTo;
  const { play: playSound } = useSfx();
  const isFirstPathSyncRef = useRef(true);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; file: FileEntity | null }>({
    visible: false, x: 0, y: 0, file: null,
  });

  useEffect(() => { playSound('explorerOpen'); }, [playSound]);

  useEffect(() => {
    if (!initialPath) return;
    if (isFirstPathSyncRef.current) { isFirstPathSyncRef.current = false; return; }
    navigateTo(initialPath);
  }, [initialPath, navigateTo, openToken]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && explorer.selected.length === 1) { e.preventDefault(); explorer.setRenaming(explorer.selected[0]); }
      if (e.key === 'Delete' && explorer.selected.length > 0) { e.preventDefault(); if (confirm(`Supprimer ${explorer.selected.length} élément(s) ?`)) explorer.deleteSelected(); }
      if (e.key === 'F5') { e.preventDefault(); explorer.refresh(); }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') { e.preventDefault(); explorer.copy(); }
        if (e.key === 'x') { e.preventDefault(); explorer.cut(); }
        if (e.key === 'v') { e.preventDefault(); void explorer.paste().then(s => { if (s) playSound('moveSuccess'); }); }
        if (e.key === 'a') { e.preventDefault(); explorer.selectAll(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [explorer, playSound]);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileEntity) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file });
  }, []);

  const handleNewFolder = useCallback(async () => {
    const name = prompt('Nom du nouveau dossier :');
    if (name) await explorer.createFolder(name);
  }, [explorer]);

  const handleNewFile = useCallback(async () => {
    prompt('Nom du nouveau fichier :');
  }, []);

  const handleCopyPath = useCallback(() => {
    if (contextMenu.file) navigator.clipboard?.writeText(contextMenu.file.path);
  }, [contextMenu.file]);

  return (
    <div className="flex h-full flex-col">
      <FileExplorerToolbar
        viewMode={explorer.viewMode} showHidden={explorer.showHidden}
        showPreview={explorer.showPreview} searchQuery={explorer.searchQuery}
        canGoBack={explorer.canGoBack} canGoForward={explorer.canGoForward}
        currentPath={explorer.currentPath}
        onViewModeChange={explorer.setViewMode} onToggleHidden={explorer.setShowHidden}
        onTogglePreview={explorer.setShowPreview} onSearchChange={explorer.setSearchQuery}
        onGoBack={explorer.goBack} onGoForward={explorer.goForward} onGoUp={explorer.goUp}
        onGoHome={() => explorer.navigateTo(QUICK_ACCESS_PATHS.home)}
        onRefresh={explorer.refresh} onNewFolder={handleNewFolder} onNewFile={handleNewFile}
        onNavigate={explorer.navigateTo} isVirtualView={explorer.isVirtualView}
      />
      <FileExplorerBreadcrumb path={explorer.currentPath} onNavigate={explorer.navigateTo} />
      <div className="flex flex-1 min-h-0">
        <FileExplorerSidebar
          currentPath={explorer.currentPath} drives={explorer.drives}
          networkMounts={explorer.networkMounts} hostname={explorer.hostname}
          platform={explorer.platform} onNavigate={explorer.navigateTo}
        />
        <ScrollArea className="relative flex-1">
          {explorer.isLoading && explorer.files.length > 0 && (
            <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-intent-primary/20 bg-surface-deep/80 px-2 py-1 backdrop-blur-sm">
              <motion.div className="w-3 h-3 border border-intent-primary/35 border-t-intent-primary"
                animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                style={{ borderRadius: '50%' }} />
            </div>
          )}
          {explorer.isVirtualView ? (
            <FileExplorerHomeContent currentPath={explorer.currentPath} files={explorer.files}
              selected={explorer.selected} driveState={explorer.driveState}
              networkMountState={explorer.networkMountState} localServiceState={explorer.localServiceState}
              onSelect={explorer.select} onOpen={explorer.open} />
          ) : explorer.isLoading && explorer.files.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <motion.div className="w-6 h-6 border border-intent-primary/40 border-t-intent-primary"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ borderRadius: '50%' }} />
            </div>
          ) : explorer.error ? (
            <div className="p-4 text-center text-[11px] text-intent-warning">{explorer.error}</div>
          ) : explorer.files.length === 0 ? (
            <div className="p-8 text-center text-[11px] text-text-ghost/40">Dossier vide</div>
          ) : (
            <FileExplorerContent files={explorer.files} viewMode={explorer.viewMode}
              sortField={explorer.sortField} sortOrder={explorer.sortOrder}
              selected={explorer.selected} renaming={explorer.renaming}
              onSelect={explorer.select} onOpen={explorer.open} onPreview={explorer.preview}
              onSort={explorer.setSort} onRename={explorer.rename} onSetRenaming={explorer.setRenaming}
              onContextMenu={handleContextMenu} />
          )}
        </ScrollArea>
        {explorer.showPreview && !explorer.isVirtualView && (
          <div className="w-[220px] min-w-[220px] border-l border-intent-primary/10">
            <FileExplorerPreview file={explorer.previewFile} content={explorer.previewContent} />
          </div>
        )}
      </div>
      <FileExplorerStatusBar files={explorer.files} selected={explorer.selected}
        allFiles={explorer.allFiles} currentDrive={explorer.currentDrive} />
      <FileExplorerContextMenu visible={contextMenu.visible} x={contextMenu.x} y={contextMenu.y}
        file={contextMenu.file} hasClipboard={Boolean(explorer.clipboard)}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onOpen={() => contextMenu.file && explorer.open(contextMenu.file)}
        onCopyPath={handleCopyPath}
        onRename={() => { if (contextMenu.file) explorer.setRenaming(contextMenu.file.id); }}
        onDelete={() => explorer.deleteSelected()} onNewFolder={handleNewFolder}
        onNewFile={handleNewFile} onCopy={explorer.copy} onCut={explorer.cut}
        onPaste={async () => { const success = await explorer.paste(); if (success) playSound('moveSuccess'); }}
        onRefresh={explorer.refresh} />
    </div>
  );
});

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
  const bg = getWallpaperBackground(settings);
  return (
    <div className="fixed inset-0" style={{ background: bg }}>
      {!booting && <DesktopWidgetShellInner />}
    </div>
  );
}
