import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { sidebarIcons } from './FileIcon';
import { cn } from '@/lib/utils';
import { REAL_VIRTUAL_PATHS } from '@/hooks/useRealFileExplorer';

interface DriveInfo {
  mount: string;
  label?: string;
  usage?: number;
}

interface Props {
  currentPath: string;
  drives: DriveInfo[];
  onNavigate: (path: string) => void;
}

const QUICK = [
  { label: 'Bureau', path: '~/Desktop', icon: sidebarIcons.desktop },
  { label: 'Telechargements', path: '~/Downloads', icon: sidebarIcons.downloads },
  { label: 'Documents', path: '~/Documents', icon: sidebarIcons.documents },
  { label: 'Images', path: '~/Pictures', icon: sidebarIcons.pictures },
  { label: 'Musique', path: '~/Music', icon: sidebarIcons.music },
  { label: 'Videos', path: '~/Videos', icon: sidebarIcons.videos },
];

const STORE_KEY = 'real-explorer.sidebar.collapsed';

function readCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

function Section({ id, label, collapsed, onToggle, children }: {
  id: string;
  label: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button onClick={() => onToggle(id)} className="flex items-center gap-1 w-full px-3 pt-3 pb-1 select-none hover:text-foreground transition-colors group">
        {collapsed ? <ChevronRight size={9} className="text-muted-foreground/50" /> : <ChevronDown size={9} className="text-muted-foreground/50" />}
        <span className="section-label">{label}</span>
      </button>
      {!collapsed && children}
    </div>
  );
}

function Item({ icon, label, active, onClick, right }: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full py-[4px] pr-2 pl-4 text-[12px] font-light transition-colors',
        'hover:bg-[hsl(var(--explorer-hover))]',
        active && 'bg-[hsl(var(--explorer-selected))] text-foreground font-normal',
      )}
    >
      <HDIcon src={icon} size={16} alt={label} fallbackEmoji="DIR" />
      <span className="truncate flex-1 text-left">{label}</span>
      {right}
    </button>
  );
}

export function RealExplorerSidebar({ currentPath, drives, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readCollapsed());
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(collapsed)); } catch {} }, [collapsed]);
  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] overflow-y-auto w-56 shrink-0 select-none">
      <Section id="quick" label="Acces rapide" collapsed={!!collapsed.quick} onToggle={toggle}>
        {QUICK.map((item) => (
          <Item key={item.path} icon={item.icon} label={item.label} active={currentPath === item.path} onClick={() => onNavigate(item.path)} />
        ))}
      </Section>

      <Section id="thispc" label="Ce PC" collapsed={!!collapsed.thispc} onToggle={toggle}>
        <Item icon={sidebarIcons.thisPC} label="Ce PC" active={currentPath === REAL_VIRTUAL_PATHS.thisPc} onClick={() => onNavigate(REAL_VIRTUAL_PATHS.thisPc)} />
        {drives.map((drive) => (
          <Item
            key={drive.mount}
            icon={String(drive.mount).toUpperCase().includes('C:') ? sidebarIcons.driveSystem : sidebarIcons.driveData}
            label={drive.label || drive.mount}
            active={currentPath === drive.mount}
            onClick={() => onNavigate(drive.mount)}
            right={typeof drive.usage === 'number' ? <span className="text-[9px] font-mono text-muted-foreground/60">{Math.round(drive.usage)}%</span> : null}
          />
        ))}
      </Section>

      <Section id="network" label="Reseau" collapsed={!!collapsed.network} onToggle={toggle}>
        <Item icon={sidebarIcons.network} label="Reseau" active={currentPath === REAL_VIRTUAL_PATHS.network} onClick={() => onNavigate(REAL_VIRTUAL_PATHS.network)} />
      </Section>

      <Section id="demo" label="Modules demo" collapsed={!!collapsed.demo} onToggle={toggle}>
        <Item icon={sidebarIcons.phone} label="Redmi A2+ (demo)" onClick={() => onNavigate('mobile-root')} />
        <Item icon={sidebarIcons.cloud} label="GitHub (demo)" onClick={() => onNavigate('virtual:demo-github')} />
        <Item icon={sidebarIcons.trashEmpty} label="Corbeille (demo)" onClick={() => onNavigate('recycle-bin')} />
      </Section>

      <div className="flex-1 min-h-4" />
    </div>
  );
}
