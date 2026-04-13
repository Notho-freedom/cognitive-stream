import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Folder, HardDrive, Network, Monitor, Star,
  Download, FileText, Image, Music, Video, Home,
} from 'lucide-react';
import type { DriveInfo } from '@/types/explorer.types';
import { QUICK_ACCESS_PATHS, formatFileSize } from '@/types/explorer.types';

interface FileExplorerSidebarProps {
  currentPath: string;
  drives: DriveInfo[];
  hostname: string;
  platform: string;
  onNavigate: (path: string) => void;
}

const quickAccessItems = [
  { key: 'home', label: 'Accueil', path: QUICK_ACCESS_PATHS.home, icon: Home },
  { key: 'desktop', label: 'Bureau', path: QUICK_ACCESS_PATHS.desktop, icon: Monitor },
  { key: 'documents', label: 'Documents', path: QUICK_ACCESS_PATHS.documents, icon: FileText },
  { key: 'downloads', label: 'Téléchargements', path: QUICK_ACCESS_PATHS.downloads, icon: Download },
  { key: 'pictures', label: 'Images', path: QUICK_ACCESS_PATHS.pictures, icon: Image },
  { key: 'music', label: 'Musique', path: QUICK_ACCESS_PATHS.music, icon: Music },
  { key: 'videos', label: 'Vidéos', path: QUICK_ACCESS_PATHS.videos, icon: Video },
];

export function FileExplorerSidebar({
  currentPath, drives, hostname, platform, onNavigate,
}: FileExplorerSidebarProps) {
  return (
    <div className="w-[180px] min-w-[180px] border-r border-intent-primary/10 flex flex-col overflow-y-auto">
      {/* Quick access */}
      <SidebarSection title="Accès rapides" icon={<Star className="w-3 h-3" />}>
        {quickAccessItems.map(item => (
          <SidebarItem
            key={item.key}
            label={item.label}
            icon={<item.icon className="w-3.5 h-3.5" />}
            active={currentPath.endsWith(item.key.charAt(0).toUpperCase() + item.key.slice(1)) || currentPath === item.path}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </SidebarSection>

      {/* Drives */}
      <SidebarSection title="Disques" icon={<HardDrive className="w-3 h-3" />}>
        {drives.length > 0 ? drives.map(drive => (
          <div key={drive.mount} className="px-2 py-1">
            <SidebarItem
              label={drive.label || drive.mount}
              icon={<HardDrive className="w-3.5 h-3.5" />}
              active={currentPath.startsWith(drive.mount)}
              onClick={() => onNavigate(drive.mount)}
            />
            {/* Usage bar */}
            <div className="ml-6 mt-0.5">
              <div className="h-1 bg-surface-deep/80 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full',
                    drive.usage > 90 ? 'bg-intent-warning' : drive.usage > 70 ? 'bg-intent-focus' : 'bg-intent-primary',
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${drive.usage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[8px] text-text-ghost/50 font-mono">
                {formatFileSize(drive.used)} / {formatFileSize(drive.total)}
              </span>
            </div>
          </div>
        )) : (
          <span className="text-[9px] text-text-ghost/40 px-3">Chargement…</span>
        )}
      </SidebarSection>

      {/* Network */}
      <SidebarSection title="Réseau" icon={<Network className="w-3 h-3" />}>
        <SidebarItem
          label={hostname}
          icon={<Monitor className="w-3.5 h-3.5" />}
          onClick={() => {}}
        />
        <div className="px-3 py-1">
          <span className="text-[8px] text-text-ghost/40 font-mono">{platform}</span>
        </div>
      </SidebarSection>
    </div>
  );
}

function SidebarSection({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 px-3 mb-1">
        <span className="text-text-ghost/50">{icon}</span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost/60">{title}</span>
      </div>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function SidebarItem({ label, icon, active, onClick }: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1 text-[11px] transition-colors text-left',
        active
          ? 'text-intent-primary bg-intent-primary/10'
          : 'text-text-ghost/70 hover:text-text-primary hover:bg-intent-primary/5',
      )}
    >
      <span className="opacity-70">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
