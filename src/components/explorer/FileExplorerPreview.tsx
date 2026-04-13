import { ScrollArea } from '@/components/ui/scroll-area';
import { File, FileText, Image as ImageIcon } from 'lucide-react';
import type { FileEntity } from '@/types/explorer.types';
import { formatFileSize, isTextFile, isImageFile } from '@/types/explorer.types';

interface FileExplorerPreviewProps {
  file: FileEntity | null;
  content: string | null;
}

export function FileExplorerPreview({ file, content }: FileExplorerPreviewProps) {
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-ghost/30">
        <File className="w-8 h-8 mb-2" />
        <span className="text-[10px]">Sélectionnez un fichier</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File info header */}
      <div className="p-3 border-b border-intent-primary/10">
        <div className="flex items-center gap-2 mb-2">
          {file.type === 'directory'
            ? <div className="w-8 h-8 bg-intent-primary/10 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-intent-primary" /></div>
            : isImageFile(file.name)
              ? <div className="w-8 h-8 bg-intent-secondary/10 rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-intent-secondary" /></div>
              : <div className="w-8 h-8 bg-text-ghost/10 rounded flex items-center justify-center"><File className="w-4 h-4 text-text-ghost/50" /></div>
          }
          <div className="min-w-0">
            <p className="text-[11px] text-text-primary truncate font-mono">{file.name}</p>
            <p className="text-[9px] text-text-ghost/50">{file.type === 'directory' ? 'Dossier' : formatFileSize(file.size)}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-[9px] text-text-ghost/60 font-mono">
          <MetaRow label="Chemin" value={file.path} />
          {file.extension && <MetaRow label="Type" value={file.extension.toUpperCase()} />}
          {file.updatedAt && <MetaRow label="Modifié" value={new Date(file.updatedAt).toLocaleString('fr-FR')} />}
          {file.mimeType && <MetaRow label="MIME" value={file.mimeType} />}
        </div>
      </div>

      {/* Content preview */}
      {content !== null && (
        <ScrollArea className="flex-1">
          <pre className="p-3 text-[10px] text-text-ghost/80 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {content}
          </pre>
        </ScrollArea>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-16 shrink-0 text-text-ghost/40">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
