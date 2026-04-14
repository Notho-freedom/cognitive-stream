import { cn } from '@/lib/utils';
import type { FileEntity } from '@/types/explorer.types';

interface ExplorerItemIconProps {
  entity: FileEntity;
  iconUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-14 h-14',
} as const;

export function ExplorerItemIcon({
  entity,
  iconUrl,
  size = 'md',
  className,
}: ExplorerItemIconProps) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={entity.name}
        className={cn(SIZE_MAP[size], 'object-contain shrink-0', className)}
        draggable={false}
      />
    );
  }

  const palette = getFallbackPalette(entity);

  return (
    <div
      className={cn(
        SIZE_MAP[size],
        'relative shrink-0 rounded-[0.8rem] border overflow-hidden',
        palette.border,
        palette.bg,
        className,
      )}
    >
      <div className={cn('absolute inset-0 opacity-80', palette.gradient)} />
      <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/20" />
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
        <div className="h-2 w-2 rounded-full bg-white/25" />
        <div className="h-2 w-6 rounded-full bg-white/15" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/85">
          {palette.label}
        </span>
      </div>
    </div>
  );
}

function getFallbackPalette(entity: FileEntity) {
  const extension = (entity.extension || '').toLowerCase();

  if (entity.kind === 'drive') {
    return palette('HD', 'bg-sky-950/70', 'border-sky-400/35', 'bg-gradient-to-br from-sky-300/35 via-slate-400/15 to-sky-950/30');
  }
  if (entity.kind === 'network-mount' || entity.path === 'virtual:network') {
    return palette('NET', 'bg-emerald-950/70', 'border-emerald-400/35', 'bg-gradient-to-br from-emerald-300/35 via-teal-300/15 to-emerald-950/30');
  }
  if (entity.kind === 'local-service') {
    return palette('DEV', 'bg-fuchsia-950/70', 'border-fuchsia-400/35', 'bg-gradient-to-br from-fuchsia-300/35 via-rose-300/15 to-fuchsia-950/30');
  }
  if (entity.type === 'directory' || entity.kind === 'directory' || entity.kind === 'quick-access') {
    return palette('DIR', 'bg-amber-950/70', 'border-amber-400/35', 'bg-gradient-to-br from-amber-200/45 via-yellow-300/18 to-amber-950/25');
  }
  if (extension === 'pdf') {
    return palette('PDF', 'bg-rose-950/70', 'border-rose-400/35', 'bg-gradient-to-br from-rose-300/40 via-red-300/18 to-rose-950/25');
  }
  if (['doc', 'docx', 'odt'].includes(extension)) {
    return palette('DOC', 'bg-blue-950/70', 'border-blue-400/35', 'bg-gradient-to-br from-blue-300/35 via-cyan-300/16 to-blue-950/25');
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return palette('XLS', 'bg-emerald-950/70', 'border-emerald-400/35', 'bg-gradient-to-br from-emerald-300/35 via-lime-300/18 to-emerald-950/25');
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    return palette('IMG', 'bg-violet-950/70', 'border-violet-400/35', 'bg-gradient-to-br from-violet-300/35 via-indigo-300/18 to-violet-950/25');
  }
  if (['mp4', 'avi', 'webm', 'mov'].includes(extension)) {
    return palette('VID', 'bg-orange-950/70', 'border-orange-400/35', 'bg-gradient-to-br from-orange-300/35 via-amber-300/18 to-orange-950/25');
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
    return palette('AUD', 'bg-pink-950/70', 'border-pink-400/35', 'bg-gradient-to-br from-pink-300/35 via-fuchsia-300/18 to-pink-950/25');
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(extension)) {
    return palette('ZIP', 'bg-stone-950/70', 'border-stone-400/35', 'bg-gradient-to-br from-stone-300/35 via-zinc-300/16 to-stone-950/25');
  }
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'css', 'html', 'md'].includes(extension)) {
    return palette('CODE', 'bg-cyan-950/70', 'border-cyan-400/35', 'bg-gradient-to-br from-cyan-300/35 via-sky-300/16 to-cyan-950/25');
  }
  if (['lnk', 'exe', 'url', 'appref-ms'].includes(extension)) {
    return palette('APP', 'bg-slate-950/70', 'border-slate-300/35', 'bg-gradient-to-br from-slate-200/35 via-slate-400/14 to-slate-950/28');
  }

  return palette('FILE', 'bg-slate-950/70', 'border-slate-400/35', 'bg-gradient-to-br from-slate-300/28 via-slate-400/14 to-slate-950/25');
}

function palette(label: string, bg: string, border: string, gradient: string) {
  return { label, bg, border, gradient };
}
