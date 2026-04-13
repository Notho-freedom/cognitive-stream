import { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Maximize2 } from 'lucide-react';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { FileExplorerToolbar } from './FileExplorerToolbar';
import { FileExplorerSidebar } from './FileExplorerSidebar';
import { FileExplorerBreadcrumb } from './FileExplorerBreadcrumb';
import { FileExplorerContent } from './FileExplorerContent';
import { FileExplorerPreview } from './FileExplorerPreview';
import { FileExplorerContextMenu } from './FileExplorerContextMenu';
import { FileExplorerStatusBar } from './FileExplorerStatusBar';
import type { FileEntity } from '@/types/explorer.types';

interface FileExplorerProps {
  initialPath?: string;
  onClose: () => void;
  onMouseStateChange?: (inside: boolean) => void;
  surfaceOpacity?: number;
}

export function FileExplorer({ initialPath, onClose, onMouseStateChange, surfaceOpacity = 0.85 }: FileExplorerProps) {
  const explorer = useFileExplorer(initialPath);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; file: FileEntity | null }>({
    visible: false, x: 0, y: 0, file: null,
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [newFolderPrompt, setNewFolderPrompt] = useState(false);

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
        if (e.key === 'v') { e.preventDefault(); explorer.paste(); }
        if (e.key === 'a') { e.preventDefault(); explorer.selectAll(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [explorer]);

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

  const currentDrive = explorer.drives.find(d => explorer.currentPath.startsWith(d.mount));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto fixed z-50"
      style={isMaximized
        ? { inset: 8 }
        : { left: '10%', top: '5%', width: '80vw', height: '85vh' }
      }
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
    >
      <FuturisticFrame variant="primary" animated={false} surfaceOpacity={surfaceOpacity} gridOpacity={0.015}>
        <div className="flex flex-col h-full" style={isMaximized ? { height: 'calc(100vh - 16px)' } : { height: '85vh' }}>
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-intent-primary/15">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-intent-primary" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-text-ghost/70">EXPLORATEUR</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMaximized(p => !p)} className="p-1 text-text-ghost/40 hover:text-text-primary transition-colors">
                <Maximize2 className="w-3 h-3" />
              </button>
              <button onClick={onClose} className="p-1 text-text-ghost/40 hover:text-intent-warning transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
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
            onGoHome={() => explorer.navigateTo('~')}
            onRefresh={explorer.refresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onNavigate={explorer.navigateTo}
          />

          {/* Breadcrumb */}
          <FileExplorerBreadcrumb path={explorer.currentPath} onNavigate={explorer.navigateTo} />

          {/* Main area */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <FileExplorerSidebar
              currentPath={explorer.currentPath}
              drives={explorer.drives}
              hostname={explorer.hostname}
              platform={explorer.platform}
              onNavigate={explorer.navigateTo}
            />

            {/* Content */}
            <ScrollArea className="flex-1">
              {explorer.isLoading ? (
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

            {/* Preview panel */}
            {explorer.showPreview && (
              <div className="w-[220px] min-w-[220px] border-l border-intent-primary/10">
                <FileExplorerPreview file={explorer.previewFile} content={explorer.previewContent} />
              </div>
            )}
          </div>

          {/* Status bar */}
          <FileExplorerStatusBar
            files={explorer.files}
            selected={explorer.selected}
            allFiles={explorer.allFiles}
            currentDrive={currentDrive}
          />
        </div>
      </FuturisticFrame>

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
        onPaste={explorer.paste}
        onRefresh={explorer.refresh}
      />
    </motion.div>
  );
}
