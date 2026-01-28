// CogCard.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardBlock, ActionCallback } from '../types';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FuturisticFrame } from '../../FuturisticFrame';
import {
  AnimatedContainer,
  DataBar,
  FuturisticButton,
  StatusIndicator,
  PulseIndicator
} from '../utils/components';

interface CogCardProps extends Omit<CardBlock, 'type'> {
  onAction?: ActionCallback;
  renderBlock: (block: CardBlock['children'][0], onAction?: ActionCallback) => React.ReactNode;
}

export function CogCard({ 
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
  actions,
  variant = 'glass',
  intent = 'primary',
  onAction,
  renderBlock,
  className 
}: CogCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    if (collapsible) setIsCollapsed(!isCollapsed);
  };

  const content = (
    <div className="p-5">
      {/* Header */}
      {(title || subtitle || collapsible) && (
        <motion.div 
          className={cn(
            'flex items-start justify-between mb-5 pb-4',
            'border-b border-intent-primary/20',
            collapsible && 'cursor-pointer select-none'
          )}
          onClick={handleToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="space-y-1.5">
            {title && (
              <h3 className="text-base font-medium text-text-primary tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[10px] text-intent-primary uppercase tracking-[0.2em] font-medium">
                {subtitle}
              </p>
            )}
          </div>
          
          {collapsible && (
            <motion.div
              animate={{ 
                rotate: isCollapsed ? 0 : 180,
                scale: isHovered ? 1.1 : 1 
              }}
              transition={{ duration: 0.2 }}
              className="text-text-ghost hover:text-intent-primary transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          )}
        </motion.div>
      )}
      
      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mb-4">
              {children.map((block, index) => (
                <motion.div
                  key={block.id || index}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {renderBlock(block, onAction)}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Actions */}
      {actions && actions.length > 0 && !isCollapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end gap-3 pt-4 border-t border-intent-primary/10"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id || index}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {renderBlock({ ...action, type: 'button' }, onAction)}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Bottom data bar - using DataBar component */}
      {!isCollapsed && (
        <DataBar 
          items={[]}
          variant=""
          intent={intent}
          customData={[
            { label: 'ID', value: `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}` },
            { label: 'LAT', value: '12ms' },
            { label: 'MEM', value: '2.4MB' },
          ]}
        />
      )}
    </div>
  );

  // Framed variant uses FuturisticFrame
  if (variant === 'framed') {
    return (
      <AnimatedContainer className={cn('max-w-lg', className)}>
        <FuturisticFrame 
          variant={intent === 'secondary' ? 'secondary' : 'primary'}
          animated={isHovered && !isCollapsed}
        >
          {content}
        </FuturisticFrame>
      </AnimatedContainer>
    );
  }

  // Glass variant with CognitiveSurface style
  return (
    <AnimatedContainer
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main glass surface */}
      <div 
        className={cn(
          'absolute inset-0 bg-surface-glass/[0.08] backdrop-blur-glass',
          'border transition-colors duration-medium',
          'border-intent-primary/20 hover:border-intent-primary/40'
        )}
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      />
      
      {/* Inner glow gradient */}
      <div 
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-medium',
          'bg-gradient-to-br from-intent-primary/5 via-transparent to-intent-secondary/5',
          isHovered && 'opacity-100'
        )} 
      />
      
      {/* Content */}
      <div className="relative z-10">
        {content}
      </div>
      
      {/* Edge highlight */}
      <div 
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          'bg-gradient-to-r from-transparent via-white/10 to-transparent'
        )}
      />
    </AnimatedContainer>
  );
}