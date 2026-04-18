import { memo } from 'react';

interface Props {
  name: string;
  isDirectory: boolean;
  size?: number;
}

/** Default vector icon when the OS resolver returns nothing (broken .lnk, removed drives). */
export const DefaultFileIcon = memo(function DefaultFileIcon({ name, isDirectory, size = 36 }: Props) {
  const lower = name.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));

  let kind: 'folder' | 'lnk' | 'exe' | 'url' | 'file' = 'file';
  if (isDirectory) kind = 'folder';
  else if (ext === '.lnk' || ext === '.appref-ms') kind = 'lnk';
  else if (ext === '.exe' || ext === '.msi' || ext === '.bat') kind = 'exe';
  else if (ext === '.url' || ext === '.html' || ext === '.htm') kind = 'url';

  const COLORS = {
    folder: { stroke: 'hsl(187 90% 60%)', fill: 'hsl(187 90% 50% / 0.18)' },
    lnk:    { stroke: 'hsl(48 95% 60%)',  fill: 'hsl(48 95% 50% / 0.15)' },
    exe:    { stroke: 'hsl(270 80% 70%)', fill: 'hsl(270 80% 60% / 0.18)' },
    url:    { stroke: 'hsl(155 70% 60%)', fill: 'hsl(155 70% 50% / 0.16)' },
    file:   { stroke: 'hsl(220 15% 75%)', fill: 'hsl(220 15% 50% / 0.16)' },
  } as const;

  const c = COLORS[kind];

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {kind === 'folder' && (
        <>
          <path d="M3 9 L13 9 L16 12 L33 12 L33 30 L3 30 Z" stroke={c.stroke} strokeWidth="1.4" fill={c.fill} />
          <line x1="3" y1="15" x2="33" y2="15" stroke={c.stroke} strokeWidth="0.6" opacity="0.5" />
        </>
      )}
      {kind !== 'folder' && (
        <>
          <path d="M7 4 L23 4 L31 12 L31 32 L7 32 Z" stroke={c.stroke} strokeWidth="1.4" fill={c.fill} />
          <path d="M23 4 L23 12 L31 12" stroke={c.stroke} strokeWidth="1.2" fill="none" />
          {kind === 'lnk' && (
            <path d="M14 26 L14 18 L19 18 M19 18 L19 23 M19 18 L13 24" stroke={c.stroke} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          )}
          {kind === 'exe' && (
            <text x="19" y="26" textAnchor="middle" fontSize="7" fill={c.stroke} fontFamily="monospace" fontWeight="600">EXE</text>
          )}
          {kind === 'url' && (
            <circle cx="19" cy="22" r="4" stroke={c.stroke} strokeWidth="1.2" fill="none" />
          )}
        </>
      )}
      {/* GX corner accent */}
      <path d="M2 2 L6 2 M2 2 L2 6" stroke={c.stroke} strokeWidth="0.8" opacity="0.7" />
      <path d="M34 34 L30 34 M34 34 L34 30" stroke={c.stroke} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
});
