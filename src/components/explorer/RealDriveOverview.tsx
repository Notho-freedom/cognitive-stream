import { Activity, Globe } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { sidebarIcons } from './FileIcon';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/data/mockFileSystem';
import type { FileItem } from '@/types/fileExplorer';

interface Props {
  mode: 'this-pc' | 'network';
  entries: FileItem[];
  onNavigate: (path: string) => void;
}

function isDrive(item: FileItem) {
  return Boolean(item.driveInfo);
}

export function RealDriveOverview({ mode, entries, onNavigate }: Props) {
  const quick = entries.filter((entry) => !isDrive(entry) && !entry.id.startsWith('service:'));
  const drives = entries.filter(isDrive);
  const services = entries.filter((entry) => entry.id.startsWith('service:'));

  if (mode === 'network') {
    return (
      <div className="flex-1 overflow-auto p-6">
        <h2 className="section-label mb-4">Emplacements reseau reels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
          {quick.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onNavigate(entry.targetPath || entry.path || entry.id)}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors text-left"
            >
              <HDIcon src={sidebarIcons.network} size={36} alt={entry.name} fallbackEmoji="NET" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal truncate">{entry.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{entry.path}</p>
              </div>
            </button>
          ))}
        </div>

        <h2 className="section-label mb-4 flex items-center gap-2">
          <Activity size={11} className="text-emerald-400/70" />
          Serveurs locaux reels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {services.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onNavigate(entry.targetPath || entry.path || entry.id)}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-400">
                <Globe size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-normal truncate">{entry.name}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">{entry.path}</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 animate-pulse" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="section-label mb-3">Dossiers frequents reels</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        {quick.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(entry.targetPath || entry.path || entry.id)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
          >
            <HDIcon src={sidebarIcons.folder} size={44} alt={entry.name} fallbackEmoji="DIR" />
            <span className="text-[12px] font-light text-center truncate w-full">{entry.name}</span>
          </button>
        ))}
      </div>

      <h2 className="section-label mb-3">Peripheriques et lecteurs reels</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {drives.map((entry) => {
          const drive = entry.driveInfo!;
          const pct = Math.round(drive.usage || 0);
          const free = Math.max(0, (drive.total || 0) - (drive.used || 0));
          return (
            <button
              key={entry.id}
              onClick={() => onNavigate(entry.targetPath || entry.path || entry.id)}
              className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors text-left"
            >
              <HDIcon src={pct > 0 && entry.name.toUpperCase().includes('C:') ? sidebarIcons.driveSystem : sidebarIcons.driveData} size={40} alt={entry.name} fallbackEmoji="DRV" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-normal truncate">{entry.name}</p>
                <div className="w-full h-[4px] rounded-full bg-background mt-1.5">
                  <div className={cn('h-full rounded-full transition-all', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary/60')} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-light">
                  {formatFileSize(free)} libres sur {formatFileSize(drive.total || 0)} · {drive.fsType || 'FS'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
