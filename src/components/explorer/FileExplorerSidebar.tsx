import { cn } from '@/lib/utils';
import { usePersistentState } from '@/hooks/usePersistentState';
import {
  ChevronDown,
  ChevronRight,
  HardDrive,
  Network,
  Monitor,
  Star,
  Download,
  FileText,
  Image,
  Music,
  Video,
  Home,
} from 'lucide-react';
import type { DriveInfo, NetworkMountInfo } from '@/types/explorer.types';
import { QUICK_ACCESS_PATHS, formatFileSize } from '@/types/explorer.types';

interface FileExplorerSidebarProps {
  currentPath: string;
  drives: DriveInfo[];
  networkMounts: NetworkMountInfo[];
  hostname: string;
  platform: string;
  onNavigate: (path: string) => void;
}

const quickAccessItems = [
  { key: 'home', label: 'Ce PC', path: QUICK_ACCESS_PATHS.thisPc, icon: Home },
  { key: 'network', label: 'Réseau', path: QUICK_ACCESS_PATHS.network, icon: Network },
  { key: 'desktop', label: 'Bureau', path: QUICK_ACCESS_PATHS.desktop, icon: Monitor },
  { key: 'documents', label: 'Documents', path: QUICK_ACCESS_PATHS.documents, icon: FileText },
  { key: 'downloads', label: 'Téléchargements', path: QUICK_ACCESS_PATHS.downloads, icon: Download },
  { key: 'pictures', label: 'Images', path: QUICK_ACCESS_PATHS.pictures, icon: Image },
  { key: 'music', label: 'Musique', path: QUICK_ACCESS_PATHS.music, icon: Music },
  { key: 'videos', label: 'Vidéos', path: QUICK_ACCESS_PATHS.videos, icon: Video },
];

export function FileExplorerSidebar({
  currentPath,
  drives,
  networkMounts,
  hostname,
  platform,
  onNavigate,
}: FileExplorerSidebarProps) {
  const [sections, setSections] = usePersistentState('explorer:sidebar-sections', {
    quick: true,
    drives: true,
    network: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  return (
    <div className="w-[200px] min-w-[200px] border-r border-intent-primary/10 flex flex-col overflow-y-auto">
      <SidebarSection
        title="Accès rapides"
        icon={<Star className="w-3 h-3" />}
        open={sections.quick}
        onToggle={() => toggleSection('quick')}
      >
        {quickAccessItems.map((item) => (
          <SidebarItem
            key={item.key}
            label={item.label}
            icon={<item.icon className="w-3.5 h-3.5" />}
            active={currentPath === item.path}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </SidebarSection>

      <SidebarSection
        title="Disques"
        icon={<HardDrive className="w-3 h-3" />}
        open={sections.drives}
        onToggle={() => toggleSection('drives')}
      >
        {drives.length > 0 ? drives.map((drive) => (
          <div key={drive.mount} className="px-2 py-1">
            <SidebarItem
              label={drive.label || drive.mount}
              icon={<HardDrive className="w-3.5 h-3.5" />}
              active={currentPath.startsWith(drive.mount)}
              onClick={() => onNavigate(drive.mount)}
            />
            <div className="ml-6 mt-0.5">
              <div className="h-[3px] rounded-full overflow-hidden bg-surface-deep/80">
                <div
                  className={cn(
                    'h-full',
                    drive.usage > 90 ? 'bg-intent-warning' : drive.usage > 70 ? 'bg-intent-focus' : 'bg-intent-primary',
                  )}
                  style={{ width: `${drive.usage}%` }}
                />
              </div>
              <span className="text-[8px] text-text-ghost/45 font-mono">
                {formatFileSize(drive.used)} / {formatFileSize(drive.total)}
              </span>
            </div>
          </div>
        )) : (
          <span className="text-[9px] text-text-ghost/40 px-3">Chargement…</span>
        )}
      </SidebarSection>

      <SidebarSection
        title="Réseau"
        icon={<Network className="w-3 h-3" />}
        open={sections.network}
        onToggle={() => toggleSection('network')}
      >
        <SidebarItem
          label="Vue Réseau"
          icon={<Network className="w-3.5 h-3.5" />}
          active={currentPath === QUICK_ACCESS_PATHS.network}
          onClick={() => onNavigate(QUICK_ACCESS_PATHS.network)}
        />
        {networkMounts.map((mount, index) => {
          const target = mount.displayRoot || mount.root || mount.name || `network:${index}`;
          return (
            <SidebarItem
              key={target}
              label={mount.name || target}
              icon={<Monitor className="w-3.5 h-3.5" />}
              active={currentPath === target}
              onClick={() => onNavigate(target)}
            />
          );
        })}
        <div className="px-3 py-1">
          <div className="text-[9px] text-text-ghost/60">{hostname}</div>
          <div className="text-[8px] text-text-ghost/35 font-mono">{platform}</div>
        </div>
      </SidebarSection>
    </div>
  );
}

function SidebarSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-1"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-text-ghost/50">{icon}</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost/60">{title}</span>
        </div>
        {open ? <ChevronDown className="w-3 h-3 text-text-ghost/45" /> : <ChevronRight className="w-3 h-3 text-text-ghost/45" />}
      </button>
      {open && <div className="space-y-px">{children}</div>}
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  active,
  onClick,
}: {
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
