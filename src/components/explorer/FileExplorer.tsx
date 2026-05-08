import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExplorerToaster } from './ExplorerToasts';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider, useI18n, Locale } from '@/i18n/LanguageContext';
import { TabBar, TabState } from './TabBar';
import { RealExplorerTab } from './RealExplorerTab';
import { CommandPalette } from './CommandPalette';
import { useSound } from '@/hooks/useSound';
import { WindowFrame } from '@/components/desktop/WindowFrame';
import { cn } from '@/lib/utils';
import './explorer.css';

export interface FileExplorerProps {
  /** Real system path to open when running with the Electron bridge. */
  initialPath?: string;
  /** Increment to force the active embedded tab to sync to initialPath. */
  openToken?: number;
  /** Visual embedding mode. Standalone keeps NextGen chrome; Cognitive Stream supplies its own frame. */
  embeddedMode?: 'standalone' | 'cognitive-stream';
  /** Folder id to open the first tab in. Defaults to the virtual "This PC" view. */
  initialFolderId?: string;
  /** UI language. Defaults to 'fr'. */
  initialLocale?: Locale;
  /** Show the tab bar with mock window controls. Defaults to true. */
  showWindowChrome?: boolean;
  /** Optional wrapper className (e.g. height/width). */
  className?: string;
  /** Optional close handler used by hosts such as Cognitive Stream. */
  onClose?: () => void;
  openSource?: 'shell' | 'widget' | 'internal';
  onMouseStateChange?: (inside: boolean) => void;
  surfaceOpacity?: number;
  /** Called whenever a file is opened (double-click on non-folder). */
  onFileOpen?: (folderId: string) => void;
  /** Called whenever the active tab navigates to a new folder. */
  onNavigate?: (folderId: string) => void;
}

function makeId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ExplorerInner({
  initialFolderId = 'root',
  initialPath,
  openToken = 0,
  onNavigate,
  showWindowControls = true,
}: {
  initialFolderId?: string;
  initialPath?: string;
  openToken?: number;
  onNavigate?: (id: string) => void;
  showWindowControls?: boolean;
}) {
  const { locale, setLocale } = useI18n();
  const { play } = useSound();
  const [tabs, setTabs] = useState<TabState[]>(() => [{ id: makeId(), folderId: initialFolderId }]);
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [realTabPaths, setRealTabPaths] = useState<Record<string, string>>(() => ({ [tabs[0].id]: initialPath || 'virtual:this-pc' }));

  const newTab = useCallback(
    (folderId: string = 'root') => {
      const id = makeId();
      setTabs((prev) => [...prev, { id, folderId }]);
      setRealTabPaths((prev) => ({ ...prev, [id]: folderId === 'root' ? 'virtual:this-pc' : folderId }));
      setActiveId(id);
      play('tab-new');
    },
    [play]
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        setRealTabPaths((paths) => {
          const { [id]: _removed, ...rest } = paths;
          return rest;
        });
        if (id === activeId) setActiveId((next[Math.max(0, idx - 1)] || next[0])?.id ?? activeId);
        return next;
      });
    },
    [activeId]
  );

  // Global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (ctrl && e.key.toLowerCase() === 't') {
        e.preventDefault();
        newTab();
      }
      if (ctrl && e.key.toLowerCase() === 'w' && tabs.length > 1) {
        e.preventDefault();
        closeTab(activeId);
      }
      if (ctrl && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveId(tabs[idx].id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, tabs, newTab, closeTab]);

  const handleFolderChange = useCallback(
    (tabId: string, folderId: string) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, folderId } : t)));
      if (tabId === activeId) onNavigate?.(folderId);
    },
    [activeId, onNavigate]
  );

  return (
    <>
      <TabBar tabs={tabs} activeId={activeId} onActivate={setActiveId} onClose={closeTab} onNew={() => newTab()} showWindowControls={showWindowControls} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {tabs.map((tab) => (
          <RealExplorerTab
            key={tab.id}
            active={tab.id === activeId}
            initialPath={realTabPaths[tab.id] || initialPath || 'virtual:this-pc'}
            openToken={tab.id === activeId ? openToken : 0}
            onPathChange={(path) => {
              setRealTabPaths((prev) => ({ ...prev, [tab.id]: path }));
              handleFolderChange(tab.id, path);
            }}
            onOpenCommandPalette={() => setCmdOpen(true)}
          />
        ))}
      </div>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={(id) => {
          window.dispatchEvent(new CustomEvent('explorer-nav', { detail: { id } }));
        }}
        onTogglePreview={() => window.dispatchEvent(new CustomEvent('explorer-toggle-preview'))}
        onToggleHidden={() => window.dispatchEvent(new CustomEvent('explorer-toggle-hidden'))}
        onToggleLanguage={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
      />
    </>
  );
}

/**
 * `<FileExplorer />` — drop-in file explorer.
 *
 * Standalone usage:
 *   <FileExplorer />
 *
 * Embedded with custom height:
 *   <FileExplorer className="h-[600px]" initialLocale="en" />
 *
 * To port into another project, copy:
 *   - src/components/explorer/
 *   - src/hooks/{useFileExplorer,useFileOperations,useSound,useMarqueeSelection,useDragDrop,useGlobalClipboard,useNotifications}.ts
 *   - src/data/{mockFileSystem,localServers}.ts
 *   - src/types/fileExplorer.ts
 *   - src/lib/{sounds,iconCache,utils}.ts
 *   - src/i18n/
 *   - public/sounds/
 *   - shadcn/ui primitives used (button, dropdown-menu, dialog, sheet, popover, tooltip, slider, command, resizable, sonner, toast)
 */
export function FileExplorer({
  initialPath,
  openToken = 0,
  embeddedMode = 'standalone',
  initialFolderId = 'root',
  initialLocale = 'fr',
  showWindowChrome = true,
  className,
  onClose,
  openSource = 'internal',
  onMouseStateChange,
  surfaceOpacity = 0.85,
  onFileOpen,
  onNavigate,
}: FileExplorerProps = {}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const isCognitiveHost = embeddedMode === 'cognitive-stream' || Boolean(onClose);
  const hostClassName = className || (isCognitiveHost ? 'h-full' : undefined);
  const explorerContent = (
    <I18nProvider initialLocale={initialLocale}>
      <TooltipProvider delayDuration={400}>
        <div
          className={cn(
            'explorer-root flex flex-col bg-background overflow-hidden text-foreground',
            !hostClassName && 'h-screen',
            hostClassName
          )}
        >
          {showWindowChrome && !isCognitiveHost ? (
            <ExplorerInner initialFolderId={initialFolderId} initialPath={initialPath} openToken={openToken} onNavigate={onNavigate} />
          ) : (
            <ExplorerInner
              initialFolderId={initialFolderId}
              initialPath={initialPath}
              openToken={openToken}
              onNavigate={onNavigate}
              showWindowControls={!isCognitiveHost}
            />
          )}
        </div>
        <ExplorerToaster />
      </TooltipProvider>
    </I18nProvider>
  );

  if (!isCognitiveHost) return explorerContent;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto fixed z-50"
      data-open-source={openSource}
      style={isMinimized
        ? { left: '10%', bottom: 16, width: 420, height: 'auto' }
        : isMaximized
          ? { inset: 8 }
          : { left: '10%', top: '5%', width: '82vw', height: '86vh' }
      }
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
      <WindowFrame
        title="NEXTGEN EXPLORER"
        minimized={isMinimized}
        maximized={isMaximized}
        onMinimize={() => setIsMinimized((previous) => !previous)}
        onMaximize={() => setIsMaximized((previous) => !previous)}
        onClose={onClose || (() => {})}
        surfaceOpacity={surfaceOpacity}
      >
        <div className="h-full overflow-hidden" style={isMaximized ? { height: 'calc(100vh - 16px)' } : { height: '86vh' }}>
          {explorerContent}
        </div>
      </WindowFrame>
    </motion.div>
  );
}
