// CogGrid.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GridBlock, ActionCallback } from '../types';
import { AnimatedContainer, PulseIndicator } from '../utils/components';

interface CogGridProps extends Omit<GridBlock, 'type'> {
  onAction?: ActionCallback;
  renderBlock: (block: GridBlock['children'][0], onAction?: ActionCallback) => React.ReactNode;
}

const gapStyles: Record<string, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function CogGrid({ 
  columns = 2,
  gap = 'md',
  children,
  onAction,
  renderBlock,
  className 
}: CogGridProps) {
  return (
    <AnimatedContainer
      className={cn(
        'grid relative',
        gapStyles[gap],
        className
      )}
    >
      <div
        className={cn(
          'grid relative',
          gapStyles[gap]
        )}
        style={{
          gridTemplateColumns: typeof columns === 'number' 
            ? `repeat(${columns}, minmax(0, 1fr))` 
            : 'repeat(auto-fit, minmax(200px, 1fr))'
        }}
      >
        {/* Grid background pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--intent-primary)/10) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--intent-primary)/10) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        <AnimatePresence mode="popLayout">
          {children.map((block, index) => (
            <motion.div
              key={block.id || `grid-item-${index}`}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ 
                delay: index * 0.05, 
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
              layout
              className="relative"
            >
              {/* Grid cell frame */}
              <div 
                className="absolute inset-0 border border-intent-neutral/10 opacity-0 hover:opacity-100 transition-opacity duration-medium"
                style={{
                  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                }}
              />
              
              {/* Content */}
              <div className="relative z-10">
                {renderBlock(block, onAction)}
              </div>
              
              {/* Corner indicators */}
              <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-intent-primary/30" />
              <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-intent-primary/30" />
              <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-intent-primary/30" />
              <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-intent-primary/30" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Scan line effect */}
        <motion.div
          className="absolute left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--intent-primary)/0.3), transparent)',
          }}
          animate={{ 
            top: ['0%', '100%', '0%'],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    </AnimatedContainer>
  );
}