import { useState, useEffect, useRef } from 'react';
import type { FileEntity, ExplorerContextAction } from '@/types/explorer.types';

interface FileExplorerContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  file: FileEntity | null;
  hasClipboard: boolean;
  onClose: () => void;
  onOpen: () => void;
  onCopyPath: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onRefresh: () => void;
}

const MENU_ACTIONS: (ExplorerContextAction & { handler: keyof Omit<FileExplorerContextMenuProps, 'visible' | 'x' | 'y' | 'file' | 'hasClipboard'> })[] = [
  { id: 'open', label: 'Ouvrir', handler: 'onOpen' },
  { id: 'sep1', label: '', separator: true, handler: 'onClose' },
  { id: 'copy', label: 'Copier', shortcut: 'Ctrl+C', handler: 'onCopy' },
  { id: 'cut', label: 'Couper', shortcut: 'Ctrl+X', handler: 'onCut' },
  { id: 'paste', label: 'Coller', shortcut: 'Ctrl+V', handler: 'onPaste' },
  { id: 'copyPath', label: 'Copier le chemin', handler: 'onCopyPath' },
  { id: 'sep2', label: '', separator: true, handler: 'onClose' },
  { id: 'rename', label: 'Renommer', shortcut: 'F2', handler: 'onRename' },
  { id: 'delete', label: 'Supprimer', shortcut: 'Suppr', danger: true, handler: 'onDelete' },
  { id: 'sep3', label: '', separator: true, handler: 'onClose' },
  { id: 'newFolder', label: 'Nouveau dossier', handler: 'onNewFolder' },
  { id: 'newFile', label: 'Nouveau fichier', handler: 'onNewFile' },
  { id: 'sep4', label: '', separator: true, handler: 'onClose' },
  { id: 'refresh', label: 'Actualiser', shortcut: 'F5', handler: 'onRefresh' },
];

export function FileExplorerContextMenu(props: FileExplorerContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) props.onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [props.visible, props.onClose]);

  if (!props.visible) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[180px] py-1 border border-intent-primary/20 bg-surface-deep/95 backdrop-blur-md shadow-xl"
      style={{
        left: props.x,
        top: props.y,
        clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
      }}
    >
      {MENU_ACTIONS.map(action => {
        if (action.separator) return <div key={action.id} className="h-px bg-intent-primary/10 my-1" />;
        if (action.id === 'paste' && !props.hasClipboard) return null;
        if (!props.file && ['open', 'rename', 'delete', 'copy', 'cut', 'copyPath'].includes(action.id)) return null;

        return (
          <button
            key={action.id}
            onClick={() => { (props as any)[action.handler](); props.onClose(); }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors ${
              action.danger
                ? 'text-intent-warning hover:bg-intent-warning/10'
                : 'text-text-ghost/80 hover:text-text-primary hover:bg-intent-primary/10'
            }`}
          >
            <span>{action.label}</span>
            {action.shortcut && <span className="text-[9px] text-text-ghost/40 ml-4">{action.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
