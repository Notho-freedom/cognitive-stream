import { cn } from '@/lib/utils';

interface FileExplorerBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function FileExplorerBreadcrumb({ path, onNavigate }: FileExplorerBreadcrumbProps) {
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
