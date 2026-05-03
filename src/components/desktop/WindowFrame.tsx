import { Minus, Maximize2, X } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface WindowFrameProps {
  title: string;
  children: React.ReactNode;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  surfaceOpacity?: number;
}

export function WindowFrame({
  title,
  children,
  minimized,
  maximized,
  onMinimize,
  onMaximize,
  onClose,
  surfaceOpacity = 0.96,
}: WindowFrameProps) {
  const { play, playHover } = useSound();

  return (
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden border border-border/40"
      style={{
        background: `hsl(220 24% 4% / ${surfaceOpacity})`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 40px hsl(0 0% 0% / 0.5)',
      }}
    >
      {/* Title bar — explorer TabBar style */}
      <div
        className="flex items-center justify-between h-9 px-2 border-b border-border/40 select-none shrink-0"
        style={{ background: 'hsl(220 24% 3%)' }}
      >
        <div className="flex items-center gap-2 pl-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[12px] font-light text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => { play('click'); onMinimize(); }}
            onMouseEnter={playHover}
            className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => { play('click'); onMaximize(); }}
            onMouseEnter={playHover}
            className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => { play('close'); onClose(); }}
            onMouseEnter={playHover}
            className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-white hover:bg-destructive transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      {!minimized && <div className="flex-1 min-h-0">{children}</div>}
      {minimized && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground font-light">
          Fenêtre réduite. Cliquez pour restaurer.
        </div>
      )}
    </div>
  );
}
