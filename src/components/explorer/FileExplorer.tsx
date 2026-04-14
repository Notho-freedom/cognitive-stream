import { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { FileExplorerToolbar } from './FileExplorerToolbar';
import { FileExplorerSidebar } from './FileExplorerSidebar';
import { FileExplorerBreadcrumb } from './FileExplorerBreadcrumb';
import { FileExplorerContent } from './FileExplorerContent';
import { FileExplorerPreview } from './FileExplorerPreview';
import { FileExplorerContextMenu } from './FileExplorerContextMenu';
import { FileExplorerStatusBar } from './FileExplorerStatusBar';
import { FileExplorerHomeContent } from './FileExplorerHomeContent';
import type { FileEntity } from '@/types/explorer.types';
import { QUICK_ACCESS_PATHS } from '@/types/explorer.types';
import { WindowFrame } from '@/components/desktop/WindowFrame';

interface FileExplorerProps {
  initialPath?: string;
  onClose: () => void;
  onMouseStateChange?: (inside: boolean) => void;
  surfaceOpacity?: number;
}

export function FileExplorer({ initialPath, onClose, onMouseStateChange, surfaceOpacity = 0.85 }: FileExplorerProps) {
  const explorer = useFileExplorer(initialPath);
  const { play: playSound } = useSoundEffects();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; file: FileEntity | null }>({
    visible: false, x: 0, y: 0, file: null,
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    playSound('explorerOpen');
  }, [playSound]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && explorer.selected.length === 1) {
        e.preventDefault();
        explorer.setRenaming(explorer.selected[0]);
      }
      if (e.key === 'Delete' && explorer.selected.length > 0) {
        e.preventDefault();
        if (confirm(`Supprimer ${explorer.selected.length} élément(s) ?`)) explorer.deleteSelected();
      }
      if (e.key === 'F5') { e.preventDefault(); explorer.refresh(); }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') { e.preventDefault(); explorer.copy(); }
        if (e.key === 'x') { e.preventDefault(); explorer.cut(); }
        if (e.key === 'v') {
          e.preventDefault();
          void explorer.paste().then((success) => {
            if (success) playSound('moveSuccess');
          });
        }
        if (e.key === 'a') { e.preventDefault(); explorer.selectAll(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [explorer, playSound]);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileEntity) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file });
  }, []);

  const handleNewFolder = useCallback(async () => {
    const name = prompt('Nom du nouveau dossier :');
    if (name) await explorer.createFolder(name);
  }, [explorer]);

  const handleNewFile = useCallback(async () => {
    const name = prompt('Nom du nouveau fichier :');
    if (name) {
      const fullPath = `${explorer.currentPath}/${name}`;
      // Use bridge to create empty file - exec touch or equivalent
    }
  }, [explorer]);

  const handleCopyPath = useCallback(() => {
    if (contextMenu.file) navigator.clipboard?.writeText(contextMenu.file.path);
  }, [contextMenu.file]);
  const handleClose = useCallback(() => {
    playSound('explorerClose');
    onClose();
  }, [onClose, playSound]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto fixed z-50"
      style={isMinimized
        ? { left: '10%', bottom: 16, width: 360, height: 'auto' }
        : isMaximized
          ? { inset: 8 }
          : { left: '10%', top: '5%', width: '80vw', height: '85vh' }
      }
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
      <WindowFrame
        title="EXPLORATEUR"
        minimized={isMinimized}
        maximized={isMaximized}
        onMinimize={() => setIsMinimized((previous) => !previous)}
        onMaximize={() => setIsMaximized((previous) => !previous)}
        onClose={handleClose}
        surfaceOpacity={surfaceOpacity}
      >
        <div
          className="relative h-full overflow-hidden"
          style={isMaximized ? { height: 'calc(100vh - 16px)' } : { height: '85vh' }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/3 left-1/3 h-[600px] w-[600px] rounded-full bg-intent-primary/3 blur-[120px]" />
            <div className="absolute bottom-1/3 right-1/3 h-[400px] w-[400px] rounded-full bg-intent-secondary/3 blur-[100px]" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
          <FileExplorerToolbar
            viewMode={explorer.viewMode}
            showHidden={explorer.showHidden}
            showPreview={explorer.showPreview}
            searchQuery={explorer.searchQuery}
            canGoBack={explorer.canGoBack}
            canGoForward={explorer.canGoForward}
            currentPath={explorer.currentPath}
            onViewModeChange={explorer.setViewMode}
            onToggleHidden={explorer.setShowHidden}
            onTogglePreview={explorer.setShowPreview}
            onSearchChange={explorer.setSearchQuery}
            onGoBack={explorer.goBack}
            onGoForward={explorer.goForward}
            onGoUp={explorer.goUp}
            onGoHome={() => explorer.navigateTo(QUICK_ACCESS_PATHS.home)}
            onRefresh={explorer.refresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onNavigate={explorer.navigateTo}
            isVirtualView={explorer.isVirtualView}
          />

          <FileExplorerBreadcrumb path={explorer.currentPath} onNavigate={explorer.navigateTo} />

          <div className="flex flex-1 min-h-0">
            <FileExplorerSidebar
              currentPath={explorer.currentPath}
              drives={explorer.drives}
              networkMounts={explorer.networkMounts}
              hostname={explorer.hostname}
              platform={explorer.platform}
              onNavigate={explorer.navigateTo}
            />

            <ScrollArea className="relative flex-1">
              {explorer.isLoading && explorer.files.length > 0 && (
                <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-intent-primary/20 bg-surface-deep/80 px-2 py-1 backdrop-blur-sm">
                  <motion.div
                    className="w-3 h-3 border border-intent-primary/35 border-t-intent-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                    style={{ borderRadius: '50%' }}
                  />
                </div>
              )}
              {explorer.isVirtualView ? (
                <FileExplorerHomeContent
                  currentPath={explorer.currentPath}
                  files={explorer.files}
                  selected={explorer.selected}
                  driveState={explorer.driveState}
                  networkMountState={explorer.networkMountState}
                  localServiceState={explorer.localServiceState}
                  onSelect={explorer.select}
                  onOpen={explorer.open}
                />
              ) : explorer.isLoading && explorer.files.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <motion.div
                    className="w-6 h-6 border border-intent-primary/40 border-t-intent-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ borderRadius: '50%' }}
                  />
                </div>
              ) : explorer.error ? (
                <div className="p-4 text-center text-[11px] text-intent-warning">{explorer.error}</div>
              ) : explorer.files.length === 0 ? (
                <div className="p-8 text-center text-[11px] text-text-ghost/40">Dossier vide</div>
              ) : (
                <FileExplorerContent
                  files={explorer.files}
                  viewMode={explorer.viewMode}
                  sortField={explorer.sortField}
                  sortOrder={explorer.sortOrder}
                  selected={explorer.selected}
                  renaming={explorer.renaming}
                  onSelect={explorer.select}
                  onOpen={explorer.open}
                  onPreview={explorer.preview}
                  onSort={explorer.setSort}
                  onRename={explorer.rename}
                  onSetRenaming={explorer.setRenaming}
                  onContextMenu={handleContextMenu}
                />
              )}
            </ScrollArea>

            {explorer.showPreview && !explorer.isVirtualView && (
              <div className="w-[220px] min-w-[220px] border-l border-intent-primary/10">
                <FileExplorerPreview file={explorer.previewFile} content={explorer.previewContent} />
              </div>
            )}
          </div>

          <FileExplorerStatusBar
            files={explorer.files}
            selected={explorer.selected}
            allFiles={explorer.allFiles}
            currentDrive={explorer.currentDrive}
          />
          </div>
        </div>
      </WindowFrame>

      {/* Context menu */}
      <FileExplorerContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        file={contextMenu.file}
        hasClipboard={Boolean(explorer.clipboard)}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onOpen={() => contextMenu.file && explorer.open(contextMenu.file)}
        onCopyPath={handleCopyPath}
        onRename={() => { if (contextMenu.file) explorer.setRenaming(contextMenu.file.id); }}
        onDelete={() => explorer.deleteSelected()}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onCopy={explorer.copy}
        onCut={explorer.cut}
        onPaste={async () => {
          const success = await explorer.paste();
          if (success) playSound('moveSuccess');
        }}
        onRefresh={explorer.refresh}
      />
    </motion.div>
  );
}
