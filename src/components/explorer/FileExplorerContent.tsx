import { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { FileEntity, ViewMode, SortField, SortOrder } from '@/types/explorer.types';
import { formatFileSize } from '@/types/explorer.types';
import { ExplorerItemIcon } from './ExplorerItemIcon';
import { useExplorerIcons } from '@/hooks/useExplorerIcons';

interface FileExplorerContentProps {
  files: FileEntity[];
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  selected: string[];
  renaming: string | null;
  onSelect: (id: string, multi?: boolean, range?: boolean) => void;
  onOpen: (entity: FileEntity) => void;
  onPreview: (entity: FileEntity) => void;
  onSort: (field: SortField) => void;
  onRename: (oldPath: string, newName: string) => Promise<boolean>;
  onSetRenaming: (id: string | null) => void;
  onContextMenu: (e: React.MouseEvent, entity: FileEntity) => void;
}

export function FileExplorerContent({
  files, viewMode, sortField, sortOrder, selected, renaming,
  onSelect, onOpen, onPreview, onSort, onRename, onSetRenaming, onContextMenu,
}: FileExplorerContentProps) {
  const icons = useExplorerIcons(files);

  if (viewMode === 'grid') return (
    <GridView files={files} selected={selected} renaming={renaming}
      icons={icons}
      onSelect={onSelect} onOpen={onOpen} onPreview={onPreview}
      onRename={onRename} onSetRenaming={onSetRenaming} onContextMenu={onContextMenu} />
  );
  if (viewMode === 'list') return (
    <ListView files={files} selected={selected} renaming={renaming}
      icons={icons}
      onSelect={onSelect} onOpen={onOpen} onPreview={onPreview}
      onRename={onRename} onSetRenaming={onSetRenaming} onContextMenu={onContextMenu} />
  );
  return (
    <DetailsView files={files} selected={selected} renaming={renaming}
      icons={icons}
      sortField={sortField} sortOrder={sortOrder}
      onSelect={onSelect} onOpen={onOpen} onPreview={onPreview}
      onSort={onSort} onRename={onRename} onSetRenaming={onSetRenaming} onContextMenu={onContextMenu} />
  );
}

// ── INLINE RENAME ──
function InlineRename({ name, onConfirm, onCancel }: {
  name: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') onConfirm(value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onConfirm(value)}
      className="bg-surface-deep border border-intent-primary/40 text-[10px] text-text-primary px-1 py-0 font-mono w-full focus:outline-none"
    />
  );
}

// ── GRID VIEW ──
function GridView({ files, selected, renaming, icons, onSelect, onOpen, onPreview, onRename, onSetRenaming, onContextMenu }: Omit<FileExplorerContentProps, 'viewMode' | 'sortField' | 'sortOrder' | 'onSort'> & { icons: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1 p-2 content-start">
      <AnimatePresence>
        {files.map(file => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <button
              className={cn(
                'flex flex-col items-center gap-1 p-2 w-[80px] transition-colors',
                selected.includes(file.id)
                  ? 'bg-intent-primary/15 text-intent-primary'
                  : 'text-text-ghost/80 hover:bg-intent-primary/5',
              )}
              onClick={e => onSelect(file.id, e.ctrlKey || e.metaKey, e.shiftKey)}
              onDoubleClick={() => onOpen(file)}
              onContextMenu={e => onContextMenu(e, file)}
            >
              <ExplorerItemIcon entity={file} iconUrl={icons[file.iconKey || file.id]} size="md" />
              {renaming === file.id ? (
                <InlineRename
                  name={file.name}
                  onConfirm={newName => { onRename(file.path, newName); onSetRenaming(null); }}
                  onCancel={() => onSetRenaming(null)}
                />
              ) : (
                <span className="text-[9px] truncate w-full text-center">{file.name}</span>
              )}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── LIST VIEW ──
function ListView({ files, selected, renaming, icons, onSelect, onOpen, onPreview, onRename, onSetRenaming, onContextMenu }: Omit<FileExplorerContentProps, 'viewMode' | 'sortField' | 'sortOrder' | 'onSort'> & { icons: Record<string, string> }) {
  return (
    <div className="flex flex-col">
      {files.map(file => (
        <button
          key={file.id}
          className={cn(
            'flex items-center gap-2 px-3 py-1 text-left transition-colors',
            selected.includes(file.id)
              ? 'bg-intent-primary/15 text-intent-primary'
              : 'text-text-ghost/80 hover:bg-intent-primary/5',
          )}
          onClick={e => onSelect(file.id, e.ctrlKey || e.metaKey, e.shiftKey)}
          onDoubleClick={() => onOpen(file)}
          onContextMenu={e => onContextMenu(e, file)}
        >
          <ExplorerItemIcon entity={file} iconUrl={icons[file.iconKey || file.id]} size="sm" />
          {renaming === file.id ? (
            <InlineRename
              name={file.name}
              onConfirm={newName => { onRename(file.path, newName); onSetRenaming(null); }}
              onCancel={() => onSetRenaming(null)}
            />
          ) : (
            <span className="text-[11px] truncate font-mono">{file.name}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── DETAILS VIEW ──
function DetailsView({ files, selected, renaming, icons, sortField, sortOrder, onSelect, onOpen, onPreview, onSort, onRename, onSetRenaming, onContextMenu }: Omit<FileExplorerContentProps, 'viewMode'> & { icons: Record<string, string> }) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col text-[10px] font-mono">
      {/* Header */}
      <div className="flex items-center border-b border-intent-primary/15 text-text-ghost/50 sticky top-0 bg-surface-deep/95 z-10">
        <ColHeader flex="1" onClick={() => onSort('name')}>Nom <SortIcon field="name" /></ColHeader>
        <ColHeader w="70px" onClick={() => onSort('size')}>Taille <SortIcon field="size" /></ColHeader>
        <ColHeader w="60px" onClick={() => onSort('type')}>Type <SortIcon field="type" /></ColHeader>
        <ColHeader w="120px" onClick={() => onSort('date')}>Modifié <SortIcon field="date" /></ColHeader>
      </div>

      {/* Rows */}
      {files.map(file => (
        <button
          key={file.id}
          className={cn(
            'flex items-center transition-colors text-left',
            selected.includes(file.id)
              ? 'bg-intent-primary/15 text-intent-primary'
              : 'text-text-ghost/80 hover:bg-intent-primary/5',
          )}
          onClick={e => { onSelect(file.id, e.ctrlKey || e.metaKey, e.shiftKey); onPreview(file); }}
          onDoubleClick={() => onOpen(file)}
          onContextMenu={e => onContextMenu(e, file)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1">
            <ExplorerItemIcon entity={file} iconUrl={icons[file.iconKey || file.id]} size="sm" />
            {renaming === file.id ? (
              <InlineRename
                name={file.name}
                onConfirm={newName => { onRename(file.path, newName); onSetRenaming(null); }}
                onCancel={() => onSetRenaming(null)}
              />
            ) : (
              <span className="truncate">{file.name}</span>
            )}
          </div>
          <div className="w-[70px] px-2 py-1 text-right text-text-ghost/50">
            {file.type === 'file' ? formatFileSize(file.size) : file.kind === 'drive' ? formatFileSize(file.size) : '--'}
          </div>
          <div className="w-[60px] px-2 py-1 text-text-ghost/50">
            {file.kind === 'drive'
              ? 'Disque'
              : file.kind === 'network-mount'
                ? 'Réseau'
                : file.kind === 'local-service'
                  ? 'Local'
                  : file.type === 'directory'
                    ? 'Dossier'
                    : (file.extension?.toUpperCase() || '?')}
          </div>
          <div className="w-[120px] px-2 py-1 text-text-ghost/50">
            {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
          </div>
        </button>
      ))}
    </div>
  );
}

function ColHeader({ children, onClick, flex, w }: {
  children: React.ReactNode;
  onClick: () => void;
  flex?: string;
  w?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 hover:text-intent-primary transition-colors uppercase tracking-wider"
      style={{ flex, width: w }}
    >
      {children}
    </button>
  );
}
