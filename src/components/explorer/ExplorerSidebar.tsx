import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { sidebarIcons } from './FileIcon';
import { drives, networkLocations, quickAccessIds, fileSystem } from '@/data/mockFileSystem';
import { locationIcons } from './icons/iconRegistry';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { CtxContext, DriveKind, NetworkKind } from './contextMenuConfig';
import { EXPLORER_DND_MIME } from '@/hooks/useDragDrop';

interface Props {
  currentFolderId: string;
  expandedNodes: Set<string>;
  onNavigate: (id: string) => void;
  onNavigateVirtual: (id: 'this-pc' | 'network' | 'trash' | 'quick-access') => void;
  onToggleExpand: (id: string) => void;
  onOpenGithub: () => void;
  githubActive: boolean;
  onSidebarDrop?: (targetFolderId: string, ids: string[], copy: boolean) => void;
}

const driveIcon = (d: { type: string; letter: string; label?: string }) => {
  if (d.type === 'removable') return sidebarIcons.usb;
  if (d.letter === 'C') return sidebarIcons.driveSystem;
  if (d.letter === 'D') return sidebarIcons.driveData;
  if (d.letter === 'E') return sidebarIcons.driveBackup;
  return sidebarIcons.driveData;
};

const driveKindOf = (d: { type: string; letter: string }): DriveKind => {
  if (d.type === 'removable') return 'removable';
  if (d.letter === 'C') return 'system';
  return 'data';
};

const netIcon = (n: { id: string; type: string }) => {
  if (n.id === 'net-gdrive') return sidebarIcons.googleDrive;
  if (n.id === 'net-onedrive') return sidebarIcons.oneDrive;
  if (n.type === 'smb') return sidebarIcons.nas;
  if (n.type === 'ftp') return sidebarIcons.ftp;
  return sidebarIcons.cloud;
};

const netKindOf = (n: { id: string; type: string }): NetworkKind => {
  if (n.id === 'net-gdrive') return 'gdrive';
  if (n.id === 'net-onedrive') return 'onedrive';
  if (n.type === 'smb') return 'smb';
  if (n.type === 'ftp') return 'ftp';
  return 'cloud';
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

const GH_ICON = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';

const repos = [
  { id: 'r1', name: 'cogni-stream/explorer', folderId: 'd-p1' },
  { id: 'r2', name: 'cogni-stream/api', folderId: 'd-p2' },
  { id: 'r3', name: 'cogni-stream/mobile', folderId: 'd-p3' },
  { id: 'r4', name: 'cogni-stream/devops', folderId: 'd-p4' },
];

const netStatusDot = (s: string) => cn('w-1.5 h-1.5 rounded-full shrink-0', s === 'connected' ? 'bg-emerald-400' : s === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-red-400/60');

const STORE_KEY = 'explorer.sidebar.collapsed';
function readCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

// Make any sidebar entry a drop target if it represents a real folder.
function dropProps(targetFolderId: string | null, onDrop?: Props['onSidebarDrop']) {
  if (!targetFolderId || !onDrop || !fileSystem[targetFolderId]) return {};
  return {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(EXPLORER_DND_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
      e.currentTarget.classList.add('ring-1', 'ring-primary/60', 'bg-primary/10');
    },
    onDragLeave: (e: React.DragEvent) => {
      e.currentTarget.classList.remove('ring-1', 'ring-primary/60', 'bg-primary/10');
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('ring-1', 'ring-primary/60', 'bg-primary/10');
      const raw = e.dataTransfer.getData(EXPLORER_DND_MIME);
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        const filtered = ids.filter(id => id !== targetFolderId);
        if (filtered.length) onDrop(targetFolderId, filtered, e.ctrlKey || e.metaKey);
      } catch {}
    },
  };
}

function TreeNode({ id, depth, currentFolderId, expandedNodes, onNavigate, onToggleExpand, onSidebarDrop }: {
  id: string; depth: number; currentFolderId: string;
  expandedNodes: Set<string>;
  onNavigate: (id: string) => void; onToggleExpand: (id: string) => void;
  onSidebarDrop?: Props['onSidebarDrop'];
}) {
  const item = fileSystem[id];
  if (!item || item.type !== 'folder' || item.isHidden) return null;
  const folderChildren = item.children?.filter(cid => fileSystem[cid]?.type === 'folder' && !fileSystem[cid]?.isHidden) || [];
  const hasChildren = folderChildren.length > 0;
  const isExpanded = expandedNodes.has(id);
  const isActive = currentFolderId === id;

  const onCtx = (e: React.MouseEvent) => {
    const ctx: CtxContext = { isBackground: false, isQuickAccess: false, file: item, hasClipboard: false, selectedCount: 0, targetId: id };
    openContextMenu(e, ctx);
  };

  return (
    <div>
      <div
        onContextMenu={onCtx}
        {...dropProps(id, onSidebarDrop)}
        className={cn(
          'flex items-center gap-1 w-full pr-2 py-[3px] text-[12px] cursor-pointer transition-colors',
          'hover:bg-[hsl(var(--explorer-hover))]',
          isActive && 'bg-[hsl(var(--explorer-selected))] text-foreground'
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand(id); }}
          className={cn('w-4 h-4 flex items-center justify-center shrink-0', !hasChildren && 'invisible')}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={10} className="text-muted-foreground/60" /> : <ChevronRight size={10} className="text-muted-foreground/60" />)}
        </button>
        <button onClick={() => onNavigate(id)} className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
          <HDIcon src={locationIcons.folder} size={14} alt="folder" fallbackEmoji="📁" />
          <span className="truncate">{item.name}</span>
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {folderChildren.map(cid => (
            <TreeNode key={cid} id={cid} depth={depth + 1} currentFolderId={currentFolderId} expandedNodes={expandedNodes} onNavigate={onNavigate} onToggleExpand={onToggleExpand} onSidebarDrop={onSidebarDrop} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, indent = 0, right, onContextMenu, dropTargetId, onSidebarDrop }: {
  icon: string; label: string; active?: boolean; onClick: () => void; indent?: number; right?: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  dropTargetId?: string | null;
  onSidebarDrop?: Props['onSidebarDrop'];
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...dropProps(dropTargetId || null, onSidebarDrop)}
      className={cn(
        'flex items-center gap-2 w-full py-[4px] pr-2 text-[12px] font-light transition-colors',
        'hover:bg-[hsl(var(--explorer-hover))]',
        active && 'bg-[hsl(var(--explorer-selected))] text-foreground font-normal'
      )}
      style={{ paddingLeft: `${indent * 14 + 16}px` }}
    >
      <HDIcon src={icon} size={16} alt={label} fallbackEmoji="📁" />
      <span className="truncate flex-1 text-left">{label}</span>
      {right}
    </button>
  );
}

function Section({ k, label, collapsed, onToggle, children }: {
  k: string; label: string; collapsed: boolean; onToggle: (k: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(k)}
        className="flex items-center gap-1 w-full px-3 pt-3 pb-1 select-none hover:text-foreground transition-colors group"
      >
        {collapsed
          ? <ChevronRight size={9} className="text-muted-foreground/50 group-hover:text-foreground" />
          : <ChevronDown size={9} className="text-muted-foreground/50 group-hover:text-foreground" />}
        <span className="section-label">{label}</span>
      </button>
      {!collapsed && children}
    </div>
  );
}

export function ExplorerSidebar({ currentFolderId, expandedNodes, onNavigate, onNavigateVirtual, onToggleExpand, onOpenGithub, githubActive, onSidebarDrop }: Props) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readCollapsed());

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(collapsed)); } catch {}
  }, [collapsed]);

  const toggleSection = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  const isThisPC = currentFolderId === 'root' && !githubActive;
  const isTrash = currentFolderId === 'recycle-bin';
  const isNetwork = currentFolderId === 'network-root';
  const isMobile = currentFolderId === 'mobile-root';

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] overflow-y-auto w-56 shrink-0 select-none">
      {/* Quick Access */}
      <Section k="quick" label={t('sidebar.quickAccess')} collapsed={!!collapsed.quick} onToggle={toggleSection}>
        {quickAccessIds.map(id => {
          const item = fileSystem[id];
          if (!item) return null;
          return (
            <SidebarItem
              key={id}
              icon={quickIcon(id)}
              label={item.name}
              active={currentFolderId === id}
              onClick={() => onNavigate(id)}
              dropTargetId={id}
              onSidebarDrop={onSidebarDrop}
              onContextMenu={(e) => openContextMenu(e, { isBackground: false, isQuickAccess: true, file: item, hasClipboard: false, selectedCount: 0, targetId: id })}
            />
          );
        })}
      </Section>

      {/* This PC */}
      <Section k="thispc" label={t('sidebar.thisPC')} collapsed={!!collapsed.thispc} onToggle={toggleSection}>
        <SidebarItem icon={sidebarIcons.thisPC} label={t('sidebar.thisPC')} active={isThisPC} onClick={() => onNavigateVirtual('this-pc')} />
        <SidebarItem icon={sidebarIcons.trashEmpty} label={t('sidebar.trash')} active={isTrash} onClick={() => onNavigateVirtual('trash')} indent={1} />

        {drives.map(drive => {
          const isActive = currentFolderId === drive.rootId;
          const isExpanded = expandedNodes.has(drive.rootId);
          const folderChildren = fileSystem[drive.rootId]?.children?.filter(cid => fileSystem[cid]?.type === 'folder' && !fileSystem[cid]?.isHidden) || [];
          const hasChildren = folderChildren.length > 0;
          const pct = Math.round((drive.usedSpace / drive.totalSpace) * 100);

          const onCtx = (e: React.MouseEvent) => openContextMenu(e, {
            isBackground: false, isDrive: true, driveKind: driveKindOf(drive), driveLetter: drive.letter,
            file: null, hasClipboard: false, selectedCount: 0, targetId: drive.rootId,
          });

          return (
            <div key={drive.id}>
              <div
                onContextMenu={onCtx}
                {...dropProps(drive.rootId, onSidebarDrop)}
                className={cn(
                  'flex items-center gap-1 w-full pr-2 py-[3px] text-[12px] cursor-pointer transition-colors',
                  'hover:bg-[hsl(var(--explorer-hover))]',
                  isActive && 'bg-[hsl(var(--explorer-selected))] text-foreground'
                )}
                style={{ paddingLeft: '16px' }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand(drive.rootId); }}
                  className={cn('w-4 h-4 flex items-center justify-center shrink-0', !hasChildren && 'invisible')}
                >
                  {hasChildren && (isExpanded ? <ChevronDown size={10} className="text-muted-foreground/60" /> : <ChevronRight size={10} className="text-muted-foreground/60" />)}
                </button>
                <button onClick={() => onNavigate(drive.rootId)} className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
                  <HDIcon src={driveIcon(drive)} size={16} alt={drive.name} fallbackEmoji="💽" />
                  <span className="truncate text-[12px]">{drive.name}</span>
                </button>
                <div className="w-8 h-[2px] rounded-full bg-muted shrink-0 ml-1">
                  <div className={cn('h-full rounded-full', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary/60')} style={{ width: `${pct}%` }} />
                </div>
              </div>
              {isExpanded && folderChildren.map(cid => (
                <TreeNode key={cid} id={cid} depth={2} currentFolderId={currentFolderId} expandedNodes={expandedNodes} onNavigate={onNavigate} onToggleExpand={onToggleExpand} onSidebarDrop={onSidebarDrop} />
              ))}
            </div>
          );
        })}
      </Section>

      {/* Network */}
      <Section k="network" label={t('sidebar.network')} collapsed={!!collapsed.network} onToggle={toggleSection}>
        <SidebarItem icon={sidebarIcons.network} label={t('sidebar.network')} active={isNetwork} onClick={() => onNavigateVirtual('network')} />
        {networkLocations.map(loc => (
          <SidebarItem
            key={loc.id}
            icon={netIcon(loc)}
            label={loc.name}
            active={currentFolderId === loc.rootId}
            onClick={() => onNavigate(loc.rootId)}
            indent={1}
            right={<span className={netStatusDot(loc.status)} />}
            dropTargetId={loc.rootId}
            onSidebarDrop={onSidebarDrop}
            onContextMenu={(e) => openContextMenu(e, {
              isBackground: false, isNetwork: true, networkKind: netKindOf(loc),
              file: null, hasClipboard: false, selectedCount: 0, targetId: loc.rootId,
            })}
          />
        ))}
      </Section>

      {/* Devices */}
      <Section k="devices" label={t('sidebar.devices')} collapsed={!!collapsed.devices} onToggle={toggleSection}>
        <SidebarItem
          icon={sidebarIcons.phone}
          label="Redmi A2+"
          active={isMobile}
          onClick={() => onNavigate('mobile-root')}
          right={<span className={netStatusDot('connected')} />}
          onContextMenu={(e) => openContextMenu(e, { isBackground: false, isMobileDevice: true, file: null, hasClipboard: false, selectedCount: 0, targetId: 'mobile-root' })}
        />
      </Section>

      {/* GitHub */}
      <Section k="github" label={t('sidebar.github')} collapsed={!!collapsed.github} onToggle={toggleSection}>
        <SidebarItem
          icon={GH_ICON}
          label={t('github.repos')}
          active={githubActive}
          onClick={onOpenGithub}
        />
        {repos.map(r => (
          <button
            key={r.id}
            onClick={() => onNavigate(r.folderId)}
            onContextMenu={(e) => openContextMenu(e, { isBackground: false, isRepo: true, file: null, hasClipboard: false, selectedCount: 0, targetId: r.folderId })}
            className={cn(
              'flex items-center gap-2 w-full py-[3px] pr-2 text-[11px] font-light font-mono transition-colors',
              'hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground hover:text-foreground'
            )}
            style={{ paddingLeft: '32px' }}
          >
            <span className="w-1 h-1 rounded-full bg-emerald-400/60 shrink-0" />
            <span className="truncate">{r.name.split('/')[1]}</span>
          </button>
        ))}
      </Section>

      <div className="flex-1 min-h-4" />
    </div>
  );
}
