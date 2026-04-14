import { cn } from '@/lib/utils';
import { QUICK_ACCESS_PATHS, isVirtualExplorerPath } from '@/types/explorer.types';

interface FileExplorerBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function FileExplorerBreadcrumb({ path, onNavigate }: FileExplorerBreadcrumbProps) {
  if (isVirtualExplorerPath(path)) {
    const items = path === QUICK_ACCESS_PATHS.thisPc
      ? [{ label: 'Ce PC', target: QUICK_ACCESS_PATHS.thisPc }]
      : [
          { label: 'Ce PC', target: QUICK_ACCESS_PATHS.thisPc },
          { label: 'Réseau', target: QUICK_ACCESS_PATHS.network },
        ];

    return (
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-intent-primary/8 overflow-x-auto">
        {items.map((item, index) => (
          <div key={item.target} className="flex items-center gap-0.5">
            {index > 0 && <Separator />}
            <BreadcrumbSegment
              label={item.label}
              isLast={index === items.length - 1}
              onClick={() => onNavigate(item.target)}
            />
          </div>
        ))}
      </div>
    );
  }

  const normalizedPath = path.replace(/\\/g, '/');
  const segments = normalizedPath.split('/').filter(Boolean);
  const isAbsolute = normalizedPath.startsWith('/');

  const buildPath = (index: number) => {
    const parts = segments.slice(0, index + 1);
    return isAbsolute ? '/' + parts.join('/') : parts.join('/');
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-intent-primary/8 overflow-x-auto">
      {isAbsolute && (
        <>
          <BreadcrumbSegment label="/" onClick={() => onNavigate('/')} />
          <Separator />
        </>
      )}
      {segments.map((segment, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && <Separator />}
          <BreadcrumbSegment
            label={segment}
            isLast={i === segments.length - 1}
            onClick={() => onNavigate(buildPath(i))}
          />
        </div>
      ))}
    </div>
  );
}

function BreadcrumbSegment({ label, isLast, onClick }: {
  label: string;
  isLast?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-mono px-1 py-0.5 transition-colors',
        isLast
          ? 'text-text-primary'
          : 'text-text-ghost/60 hover:text-intent-primary',
      )}
    >
      {label}
    </button>
  );
}

function Separator() {
  return <span className="text-[10px] text-text-ghost/30 font-mono">/</span>;
}
