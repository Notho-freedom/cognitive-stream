import { useRef, useState, useCallback, type ReactNode, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WidgetFrameProps {
  children: ReactNode;
  className?: string;
  /** Position initiale (% du viewport ou px) */
  defaultPosition?: { x: number; y: number };
  /** Taille minimale */
  minWidth?: number;
  minHeight?: number;
  /** Titre affiché dans le header du widget */
  title?: string;
  /** Variante de couleur d'accent */
  accent?: 'primary' | 'secondary' | 'neutral';
  /** Le widget est-il visible */
  visible?: boolean;
  /** Callback quand la souris entre/sort (pour click-through Electron) */
  onMouseStateChange?: (inside: boolean) => void;
  /** Compact mode - header réduit */
  compact?: boolean;
}

/**
 * WidgetFrame - Conteneur draggable pour les widgets de bureau
 * Style GX angulaire avec glassmorphisme et bordures biseautées
 */
export function WidgetFrame({
  children,
  className,
  defaultPosition = { x: 100, y: 100 },
  title,
  accent = 'primary',
  visible = true,
  onMouseStateChange,
  compact = false,
}: WidgetFrameProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const accentColors = {
    primary: {
      border: 'hsl(187, 85%, 53%)',
      glow: 'hsl(187, 100%, 60%)',
      dim: 'hsl(187, 85%, 35%)',
      text: 'text-intent-primary',
    },
    secondary: {
      border: 'hsl(270, 80%, 65%)',
      glow: 'hsl(270, 100%, 72%)',
      dim: 'hsl(270, 80%, 45%)',
      text: 'text-intent-secondary',
    },
    neutral: {
      border: 'hsl(220, 15%, 45%)',
      glow: 'hsl(220, 15%, 55%)',
      dim: 'hsl(220, 15%, 30%)',
      text: 'text-text-ghost',
    },
  }[accent];

  const handleDragStart = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };

    const handleMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [position]);

  const handleMouseEnter = useCallback(() => {
    onMouseStateChange?.(true);
  }, [onMouseStateChange]);

  const handleMouseLeave = useCallback(() => {
    onMouseStateChange?.(false);
  }, [onMouseStateChange]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('fixed z-50', className)}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative overflow-hidden"
        style={{
          clipPath: 'polygon(16px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 16px)',
          background: `linear-gradient(135deg, hsl(220 22% 8% / 0.92), hsl(220 22% 6% / 0.95))`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${accentColors.border}20 1px, transparent 1px),
              linear-gradient(90deg, ${accentColors.border}20 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Drag handle / header */}
        {title && (
          <div
            className={cn(
              'flex items-center justify-between border-b border-intent-neutral/10',
              compact ? 'px-3 py-1.5' : 'px-4 py-2',
            )}
            onMouseDown={handleDragStart}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColors.border }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className={cn(
                'uppercase tracking-[0.25em] font-light select-none',
                accentColors.text,
                compact ? 'text-[7px]' : 'text-[8px]',
              )}>
                {title}
              </span>
            </div>

            {/* Decorative corner marks */}
            <div className="flex items-center gap-1 opacity-30">
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColors.dim }} />
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColors.border }} />
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColors.dim }} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Scan line */}
        <motion.div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColors.glow}40, transparent)`,
          }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Border edges */}
      <div
        className="absolute top-0 left-[20px] right-[8px] h-px"
        style={{ background: `linear-gradient(90deg, ${accentColors.glow}80, ${accentColors.dim}30)` }}
      />
      <div
        className="absolute bottom-0 left-[8px] right-[20px] h-px"
        style={{ background: `linear-gradient(90deg, ${accentColors.dim}30, ${accentColors.glow}80)` }}
      />
      <div
        className="absolute left-0 top-[20px] bottom-[8px] w-px"
        style={{ background: `linear-gradient(180deg, ${accentColors.glow}80, ${accentColors.dim}20)` }}
      />
      <div
        className="absolute right-0 top-[8px] bottom-[20px] w-px"
        style={{ background: `linear-gradient(180deg, ${accentColors.dim}20, ${accentColors.glow}80)` }}
      />

      {/* Corner accents */}
      <motion.div
        className="absolute -top-px -left-px"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="0" y1="16" x2="16" y2="0" stroke={accentColors.glow} strokeWidth="1" />
          <circle cx="14" cy="2" r="1.5" fill={accentColors.glow} />
        </svg>
      </motion.div>

      <motion.div
        className="absolute -bottom-px -right-px"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="4" y1="20" x2="20" y2="4" stroke={accentColors.glow} strokeWidth="1" />
          <circle cx="6" cy="18" r="1.5" fill={accentColors.glow} />
        </svg>
      </motion.div>
    </motion.div>
  );
}
