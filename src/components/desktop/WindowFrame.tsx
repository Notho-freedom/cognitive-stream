import { Minus, Maximize2, X } from 'lucide-react';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';

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
  surfaceOpacity = 0.85,
}: WindowFrameProps) {
  return (
    <FuturisticFrame variant="primary" animated={false} surfaceOpacity={surfaceOpacity} gridOpacity={0.015}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-intent-primary/15">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-intent-primary" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-text-ghost/70">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMinimize} className="p-1 text-text-ghost/40 hover:text-text-primary transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={onMaximize} className="p-1 text-text-ghost/40 hover:text-text-primary transition-colors">
              <Maximize2 className="w-3 h-3" />
            </button>
            <button onClick={onClose} className="p-1 text-text-ghost/40 hover:text-intent-warning transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {!minimized && <div className="flex-1 min-h-0">{children}</div>}
        {minimized && (
          <div className="px-4 py-2 text-[10px] text-text-ghost/55">
            Fenêtre réduite. Utilise l’icône réduire pour restaurer.
          </div>
        )}
      </div>
    </FuturisticFrame>
  );
}
