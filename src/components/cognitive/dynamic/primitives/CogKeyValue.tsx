import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { KeyValueBlock } from '../types';

interface CogKeyValueProps extends Omit<KeyValueBlock, 'type'> {}

export function CogKeyValue({ 
  pairs, 
  layout = 'horizontal',
  intent = 'primary',
  className 
}: CogKeyValueProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        layout === 'horizontal' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-3',
        'relative',
        className
      )}
    >
      {/* Grid pattern background */}
      {layout === 'horizontal' && (
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--intent-primary)/10) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--intent-primary)/10) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      )}
      
      <AnimatePresence mode="popLayout">
        {pairs.map((pair, index) => (
          <motion.div
            key={`${pair.key}-${index}`}
            initial={{ opacity: 0, x: layout === 'horizontal' ? -12 : 0, y: layout === 'vertical' ? 8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: layout === 'horizontal' ? 12 : 0 }}
            transition={{ 
              delay: index * 0.07, 
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1]
            }}
            layout
            className={cn(
              'group relative',
              layout === 'horizontal' 
                ? 'p-4 border border-intent-neutral/10 hover:border-intent-primary/30 transition-colors duration-medium'
                : 'flex justify-between items-center py-2 border-b border-intent-neutral/10 last:border-b-0'
            )}
            style={{
              clipPath: layout === 'horizontal' ? 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' : undefined,
            }}
          >
            {/* Background for horizontal layout */}
            {layout === 'horizontal' && (
              <>
                <div 
                  className="absolute inset-0 bg-surface-glass/[0.04] backdrop-blur-glass opacity-0 group-hover:opacity-100 transition-opacity duration-medium"
                  style={{
                    clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                  }}
                />
                
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-intent-primary/20 group-hover:border-intent-primary/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-intent-primary/20 group-hover:border-intent-primary/40 transition-colors" />
              </>
            )}
            
            {/* Key section */}
            <div className={cn(
              layout === 'horizontal' ? 'mb-2' : 'flex items-center gap-2'
            )}>
              <span className="text-xs uppercase tracking-widest text-text-ghost flex items-center gap-1.5">
                {pair.icon && (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    className="text-intent-primary/60"
                  >
                    {pair.icon}
                  </motion.span>
                )}
                {pair.key}
              </span>
              
              {/* Animated dot for horizontal layout */}
              {layout === 'horizontal' && (
                <motion.div
                  className="w-1 h-1 rounded-full bg-intent-primary/40 ml-2"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.3 }}
                />
              )}
            </div>
            
            {/* Value section */}
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.1 }}
              className={cn(
                layout === 'horizontal' 
                  ? 'text-lg font-medium text-text-primary tracking-tight'
                  : 'text-sm font-light text-text-primary'
              )}
            >
              {pair.value}
            </motion.span>
            
            {/* Connection line for horizontal layout */}
            {layout === 'horizontal' && (
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-intent-primary/20 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.05 + 0.2 }}
              />
            )}
            
            {/* Hover effect indicator */}
            {layout === 'horizontal' && (
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-intent-primary/20 to-transparent"
                style={{
                  clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Scan effect for grid layout */}
      {layout === 'horizontal' && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
          }}
        >
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent"
            animate={{ y: [0, '100%', 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}