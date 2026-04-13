import { formatFileSize } from '@/types/explorer.types';
import type { DriveInfo, FileEntity } from '@/types/explorer.types';

interface FileExplorerStatusBarProps {
  files: FileEntity[];
  selected: string[];
  allFiles: FileEntity[];
  currentDrive?: DriveInfo;
}

export function FileExplorerStatusBar({ files, selected, allFiles, currentDrive }: FileExplorerStatusBarProps) {
  const selectedFiles = allFiles.filter(f => selected.includes(f.id));
  const selectedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-intent-primary/10 text-[9px] text-text-ghost/50 font-mono">
      <div className="flex items-center gap-4">
        <span>{files.length} éléments</span>
        {selected.length > 0 && (
          <span>{selected.length} sélectionné{selected.length > 1 ? 's' : ''} — {formatFileSize(selectedSize)}</span>
        )}
      </div>
      {currentDrive && (
        <span>
          {formatFileSize(currentDrive.total - currentDrive.used)} disponible sur {currentDrive.mount}
        </span>
      )}
    </div>
  );
}
