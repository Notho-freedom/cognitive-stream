import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from '../types';

interface CogSkeletonProps extends Omit<SkeletonBlock, 'type'> {
  variant?: 'text' | 'card' | 'list' | 'image' | 'grid';
  lines?: number;
}

const shimmerConfig = {
  gradient: 'linear-gradient(90deg, transparent 0%, hsl(var(--intent-primary)/0.1) 50%, transparent 100%)',
  duration: 1.5,
};

export function CogSkeleton({ 
  variant = 'text',
  lines = 3,
  className 
}: CogSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, width: i === lines - 1 ? '75%' : '100%' }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden"
                style={{
                  clipPath: 'polygon(2px 0%, 100% 0%, calc(100% - 2px) 100%, 0% 100%)',
                }}
              >
                <div className={cn(
                  'h-4 bg-surface-glass/[0.1]',
                  i === 0 ? 'w-1/2' : i === lines - 1 ? 'w-3/4' : 'w-full'
                )} />
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ 
                    duration: shimmerConfig.duration, 
                    repeat: Infinity, 
                    ease: 'linear',
                    delay: i * 0.15 
                  }}
                />
                
                {/* Glow edges */}
                <div className="absolute inset-0 border border-intent-primary/10 opacity-0 animate-pulse" />
              </motion.div>
            ))}
          </div>
        );
      
      case 'card':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative p-5"
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            {/* Card background */}
            <div className="absolute inset-0 bg-surface-glass/[0.06] backdrop-blur-glass border border-intent-neutral/20" />
            
            {/* Header skeleton */}
            <div className="relative mb-4 space-y-2">
              <div className="h-5 w-1/3 bg-surface-glass/[0.1] overflow-hidden rounded">
                <motion.div
                  className="h-full"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <div className="h-3 w-1/4 bg-surface-glass/[0.1] overflow-hidden rounded">
                <motion.div
                  className="h-full"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                />
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="relative space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-4 bg-surface-glass/[0.1] overflow-hidden rounded">
                  <motion.div
                    className="h-full"
                    style={{ background: shimmerConfig.gradient }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: i * 0.15 }}
                  />
                </div>
              ))}
            </div>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary/20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary/20" />
            
            {/* Data bar */}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between">
              <div className="h-2 w-12 bg-surface-glass/[0.1] overflow-hidden rounded">
                <motion.div
                  className="h-full"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: 0.3 }}
                />
              </div>
              <div className="h-2 w-8 bg-surface-glass/[0.1] overflow-hidden rounded">
                <motion.div
                  className="h-full"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        );
      
      case 'list':
        return (
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                {/* Icon skeleton */}
                <div className="w-8 h-8 rounded-full bg-surface-glass/[0.1] overflow-hidden relative">
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: shimmerConfig.gradient }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
                  />
                </div>
                
                {/* Text skeleton */}
                <div className="flex-1 h-4 bg-surface-glass/[0.1] overflow-hidden rounded">
                  <motion.div
                    className="h-full"
                    style={{ background: shimmerConfig.gradient }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: i * 0.15 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        );
      
      case 'image':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative aspect-video overflow-hidden"
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            <div className="absolute inset-0 bg-surface-glass/[0.1] border border-intent-neutral/20" />
            
            {/* Grid pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--intent-primary)/20) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--intent-primary)/20) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0"
              style={{ background: shimmerConfig.gradient }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Corner indicators */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-intent-primary/30" />
            <div className="absolute top-4 right-4 w-3 h-3 border-t border-r border-intent-primary/30" />
            <div className="absolute bottom-4 left-4 w-3 h-3 border-b border-l border-intent-primary/30" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-intent-primary/30" />
            
            {/* Loading indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 text-[10px] text-text-ghost font-mono">
                <motion.div
                  className="w-2 h-2 rounded-full bg-intent-primary/40"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span>LOADING IMAGE</span>
              </div>
            </div>
          </motion.div>
        );
      
      case 'grid':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="aspect-square bg-surface-glass/[0.06] border border-intent-neutral/20 overflow-hidden"
                style={{
                  clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: shimmerConfig.gradient }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: shimmerConfig.duration, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
                />
              </motion.div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative', className)}
    >
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--intent-primary)/10) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--intent-primary)/10) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {renderSkeleton()}
      
      {/* Data stream effect */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-intent-primary/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}