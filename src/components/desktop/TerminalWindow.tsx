import { useState, useCallback } from 'react';
import { TerminalPanel } from '@/components/explorer/TerminalPanel';
import { fileSystem } from '@/data/mockFileSystem';

interface Props {
  onClose: () => void;
}

/**
 * Standalone terminal window wrapper for the explorer's TerminalPanel.
 */
export function TerminalWindow({ onClose }: Props) {
  const [cwd, setCwd] = useState('root');

  const cwdName = fileSystem[cwd]?.name
    ? `C:\\${fileSystem[cwd].name}`
    : 'C:\\';

  const handleMkdir = useCallback((name: string) => {
    // Mock — no actual FS mutation outside of explorer context
    console.log(`[TerminalWindow] mkdir ${name} in ${cwd}`);
  }, [cwd]);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--explorer-surface))]">
      <TerminalPanel
        open
        cwd={cwd}
        cwdName={cwdName}
        onClose={onClose}
        onCd={setCwd}
        onMkdir={handleMkdir}
      />
    </div>
  );
}
