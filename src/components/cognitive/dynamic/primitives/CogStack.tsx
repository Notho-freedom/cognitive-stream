import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StackBlock, ActionCallback } from '../types';

interface CogStackProps extends Omit<StackBlock, 'type'> {
  onAction?: ActionCallback;
  renderBlock: (block: StackBlock['children'][0], onAction?: ActionCallback) => React.ReactNode;
}

const gapStyles: Record<string, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignStyles: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyStyles: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export function CogStack({ 
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  children,
  onAction,
  renderBlock,
  className 
}: CogStackProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        gapStyles[gap],
        alignStyles[align],
        justifyStyles[justify],
        className
      )}
    >
      {/* Connection lines for vertical stack */}
      {direction === 'vertical' && children.length > 1 && (
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-intent-primary/10 to-transparent" />
          
          {/* Connection dots */}
          {children.map((_, index) => (
            <motion.div
              key={index}
              className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-intent-primary/30 border border-intent-primary/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              style={{
                top: `${(index / (children.length - 1)) * 100}%`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Connection lines for horizontal stack */}
      {direction === 'horizontal' && children.length > 1 && (
        <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-intent-primary/10 to-transparent" />
          
          {/* Connection dots */}
          {children.map((_, index) => (
            <motion.div
              key={index}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-intent-primary/30 border border-intent-primary/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              style={{
                left: `${(index / (children.length - 1)) * 100}%`,
              }}
            />
          ))}
        </div>
      )}
      
      <AnimatePresence mode="popLayout">
        {children.map((block, index) => (
          <motion.div
            key={block.id || `stack-item-${index}`}
            layout
            initial={{ 
              opacity: 0, 
              y: direction === 'vertical' ? 12 : 0, 
              x: direction === 'horizontal' ? 12 : 0 
            }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              x: 0,
              transition: { delay: index * 0.05 }
            }}
            exit={{ 
              opacity: 0, 
              y: direction === 'vertical' ? -12 : 0, 
              x: direction === 'horizontal' ? -12 : 0 
            }}
            transition={{ 
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
              layout: { duration: 0.2 }
            }}
            className={cn(
              'relative',
              direction === 'horizontal' ? '' : 'w-full'
            )}
          >
            {/* Item container with tech frame */}
            <div className="relative">
              {/* Item frame */}
              <div 
                className={cn(
                  'absolute inset-0 border border-intent-neutral/20 opacity-0 hover:opacity-100 transition-opacity duration-medium',
                  direction === 'vertical' ? 'mx-2' : 'my-2'
                )}
                style={{
                  clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                }}
              />
              
              {/* Item number indicator */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center">
                <motion.div
                  className="w-6 h-6 rounded-full border border-intent-primary/30 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <span className="text-[10px] font-mono text-intent-primary">
                    {index + 1}
                  </span>
                </motion.div>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {renderBlock(block, onAction)}
              </div>
              
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-intent-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-intent-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {/* Connection arrow for vertical */}
            {direction === 'vertical' && index < children.length - 1 && (
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.4 }}
              >
                <div className="w-4 h-4 rotate-45 border-b border-r border-intent-primary/40" />
              </motion.div>
            )}
            
            {/* Connection arrow for horizontal */}
            {direction === 'horizontal' && index < children.length - 1 && (
              <motion.div
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.4 }}
              >
                <div className="w-4 h-4 rotate-45 border-r border-t border-intent-primary/40" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Scan effect */}
      <motion.div
        className={cn(
          'absolute pointer-events-none',
          direction === 'vertical' 
            ? 'left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/20 to-transparent'
            : 'top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-intent-primary/20 to-transparent'
        )}
        animate={direction === 'vertical' ? { y: [0, '100%', 0] } : { x: [0, '100%', 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Data bar for stack */}
      <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-between text-[8px] text-text-ghost font-mono">
        <motion.span 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          STACK:{direction.toUpperCase()}
        </motion.span>
        <motion.span 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        >
          ITEMS:{children.length}
        </motion.span>
        <motion.span 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        >
          ALIGN:{align.toUpperCase()}
        </motion.span>
      </div>
    </motion.div>
  );
}