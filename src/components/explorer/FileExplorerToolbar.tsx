import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, ArrowUp, Home, RefreshCw, Search,
  Grid3X3, List, Columns3, Eye, EyeOff, FolderPlus, FilePlus,
} from 'lucide-react';
import type { ViewMode } from '@/types/explorer.types';
import { QUICK_ACCESS_PATHS, isVirtualExplorerPath } from '@/types/explorer.types';

interface FileExplorerToolbarProps {
  viewMode: ViewMode;
  showHidden: boolean;
  showPreview: boolean;
  searchQuery: string;
  canGoBack: boolean;
  canGoForward: boolean;
  currentPath: string;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleHidden: () => void;
  onTogglePreview: () => void;
  onSearchChange: (query: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onGoHome: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onNavigate: (path: string) => void;
  isVirtualView?: boolean;
}

export function FileExplorerToolbar({
  viewMode, showHidden, showPreview, searchQuery,
  canGoBack, canGoForward, currentPath,
  onViewModeChange, onToggleHidden, onTogglePreview, onSearchChange,
  onGoBack, onGoForward, onGoUp, onGoHome, onRefresh,
  onNewFolder, onNewFile, onNavigate, isVirtualView,
}: FileExplorerToolbarProps) {
  const handlePathKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNavigate((e.target as HTMLInputElement).value);
    }
  }, [onNavigate]);

  const displayPath = isVirtualExplorerPath(currentPath)
    ? currentPath === QUICK_ACCESS_PATHS.network ? 'Réseau' : 'Ce PC'
    : currentPath;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-intent-primary/10">
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5">
        <ToolBtn disabled={!canGoBack} onClick={onGoBack}><ArrowLeft className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn disabled={!canGoForward} onClick={onGoForward}><ArrowRight className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={onGoUp}><ArrowUp className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={onGoHome}><Home className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={onRefresh}><RefreshCw className="w-3.5 h-3.5" /></ToolBtn>
      </div>

      {/* Address bar */}
      <div className="flex-1 mx-2">
        <input
          type="text"
          defaultValue={displayPath}
          key={displayPath}
          onKeyDown={handlePathKeyDown}
          className="w-full bg-surface-deep/80 border border-intent-primary/20 text-text-primary text-[11px] px-2 py-1 rounded-none font-mono focus:border-intent-primary/50 focus:outline-none"
          style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-ghost/50" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher..."
          className="w-28 bg-surface-deep/60 border border-intent-primary/15 text-[10px] text-text-primary pl-5 pr-2 py-1 focus:outline-none focus:border-intent-primary/40 font-mono"
        />
      </div>

      <div className="w-px h-5 bg-intent-primary/15 mx-1" />

      {/* View mode */}
      <div className="flex items-center gap-0.5">
        <ToolBtn active={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}><Grid3X3 className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn active={viewMode === 'list'} onClick={() => onViewModeChange('list')}><List className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn active={viewMode === 'details'} onClick={() => onViewModeChange('details')}><Columns3 className="w-3.5 h-3.5" /></ToolBtn>
      </div>

      <div className="w-px h-5 bg-intent-primary/15 mx-1" />

      {/* Toggles */}
      <ToolBtn active={showHidden} onClick={onToggleHidden} title="Fichiers cachés">
        {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </ToolBtn>
      <ToolBtn active={showPreview} onClick={onTogglePreview} title="Prévisualisation">
        <Columns3 className="w-3.5 h-3.5" />
      </ToolBtn>

      <div className="w-px h-5 bg-intent-primary/15 mx-1" />

      {/* Create */}
      <ToolBtn disabled={isVirtualView} onClick={onNewFolder} title="Nouveau dossier"><FolderPlus className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn disabled={isVirtualView} onClick={onNewFile} title="Nouveau fichier"><FilePlus className="w-3.5 h-3.5" /></ToolBtn>
    </div>
  );
}

function ToolBtn({ children, onClick, disabled, active, title }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 transition-colors',
        disabled ? 'text-text-ghost/20 cursor-not-allowed' : 'text-text-ghost/60 hover:text-intent-primary hover:bg-intent-primary/10',
        active && 'text-intent-primary bg-intent-primary/15',
      )}
    >
      {children}
    </button>
  );
}
