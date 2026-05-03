import { drives, networkLocations, quickAccessIds, fileSystem } from '@/data/mockFileSystem';
import { HDIcon } from './icons/HDIcon';
import { sidebarIcons } from './FileIcon';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { localServers } from '@/data/localServers';
import { Globe, Activity } from 'lucide-react';

interface Props {
  onNavigate: (id: string) => void;
  onNavigateTrash?: () => void;
  onOpenLocalServer?: (id: string) => void;
  mode: 'this-pc' | 'network';
}

const driveIcon = (d: { type: string; letter: string }) => {
  if (d.type === 'removable') return sidebarIcons.usb;
  if (d.letter === 'C') return sidebarIcons.driveSystem;
  if (d.letter === 'D') return sidebarIcons.driveData;
  if (d.letter === 'E') return sidebarIcons.driveBackup;
  return sidebarIcons.driveData;
};

const netIcon = (n: { id: string; type: string }) => {
  if (n.id === 'net-gdrive') return sidebarIcons.googleDrive;
  if (n.id === 'net-onedrive') return sidebarIcons.oneDrive;
  if (n.type === 'smb') return sidebarIcons.nas;
  if (n.type === 'ftp') return sidebarIcons.ftp;
  return sidebarIcons.cloud;
};

const quickIcon = (id: string) => {
  switch (id) {
    case 'desktop': return sidebarIcons.desktop;
    case 'downloads': return sidebarIcons.downloads;
    case 'documents': return sidebarIcons.documents;
    case 'pictures': return sidebarIcons.pictures;
    case 'music': return sidebarIcons.music;
    case 'videos': return sidebarIcons.videos;
    default: return sidebarIcons.folder;
  }
};

export function DriveOverview({ onNavigate, onNavigateTrash, onOpenLocalServer, mode }: Props) {
  const { t } = useI18n();

  if (mode === 'network') {
    return (
      <div className="flex-1 overflow-auto p-6">
        <h2 className="section-label mb-4">{t('drives.networkLocations')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
          {networkLocations.map(loc => (
            <div
              key={loc.id}
              onClick={() => onNavigate(loc.rootId)}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <HDIcon src={netIcon(loc)} size={36} alt={loc.name} fallbackEmoji="☁️" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal truncate">{loc.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{loc.path}</p>
              </div>
              <span className={cn('w-2 h-2 rounded-full shrink-0',
                loc.status === 'connected' ? 'bg-emerald-400' : loc.status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-red-400/60'
              )} />
            </div>
          ))}
        </div>

        <h2 className="section-label mb-4 flex items-center gap-2">
          <Activity size={11} className="text-emerald-400/70" />
          Serveurs locaux
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {localServers.map(srv => (
            <div
              key={srv.id}
              onClick={() => onOpenLocalServer?.(srv.id)}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors group"
            >
              <div className={cn(
                'w-10 h-10 rounded-md flex items-center justify-center shrink-0',
                srv.status === 'running' ? 'bg-emerald-500/15 text-emerald-400' :
                srv.status === 'stopped' ? 'bg-muted text-muted-foreground' : 'bg-red-500/15 text-red-400'
              )}>
                <Globe size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-normal truncate flex items-center gap-1.5">
                  {srv.name}
                  <span className="text-[9px] font-mono text-muted-foreground">:{srv.port}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">{srv.framework}</p>
              </div>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                srv.status === 'running' ? 'bg-emerald-400 animate-pulse' :
                srv.status === 'stopped' ? 'bg-muted-foreground/40' : 'bg-red-400'
              )} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Frequent folders */}
      <h2 className="section-label mb-3">{t('drives.frequentFolders')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        {quickAccessIds.map(id => {
          const item = fileSystem[id];
          if (!item) return null;
          return (
            <div
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <HDIcon src={quickIcon(id)} size={44} alt={item.name} fallbackEmoji="📁" />
              <span className="text-[12px] font-light text-center truncate w-full">{item.name}</span>
            </div>
          );
        })}
        {/* Recycle bin shortcut */}
        {onNavigateTrash && (
          <div
            onClick={onNavigateTrash}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
          >
            <HDIcon src={sidebarIcons.trashEmpty} size={44} alt={t('drives.recycleBin')} fallbackEmoji="🗑️" />
            <span className="text-[12px] font-light text-center truncate w-full">{t('drives.recycleBin')}</span>
          </div>
        )}
      </div>

      {/* Drives */}
      <h2 className="section-label mb-3">{t('drives.devicesAndDrives')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {drives.map(drive => {
          const pct = Math.round((drive.usedSpace / drive.totalSpace) * 100);
          const free = drive.totalSpace - drive.usedSpace;
          return (
            <div
              key={drive.id}
              onClick={() => onNavigate(drive.rootId)}
              className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <HDIcon src={driveIcon(drive)} size={40} alt={drive.name} fallbackEmoji={drive.type === 'removable' ? '🔑' : '💽'} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-normal truncate">{drive.name}</p>
                <div className="w-full h-[4px] rounded-full bg-background mt-1.5">
                  <div
                    className={cn('h-full rounded-full transition-all', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary/60')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-light">
                  {free.toFixed(0)} {t('drives.freeOf')} {drive.totalSpace} Go · {drive.fileSystem}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network shortcuts */}
      <h2 className="section-label mb-3">{t('drives.networkLocations')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {networkLocations.map(loc => (
          <div
            key={loc.id}
            onClick={() => onNavigate(loc.rootId)}
            className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
          >
            <HDIcon src={netIcon(loc)} size={28} alt={loc.name} fallbackEmoji="☁️" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-light truncate">{loc.name}</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">{loc.path}</p>
            </div>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
              loc.status === 'connected' ? 'bg-emerald-400' : loc.status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-red-400/60'
            )} />
          </div>
        ))}
      </div>
    </div>
  );
}
