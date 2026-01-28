// CogChoice.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChoiceBlock, ActionCallback } from '../types';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { AnimatedContainer } from '../utils/components';

interface CogChoiceProps extends Omit<ChoiceBlock, 'type'> {
  onAction?: ActionCallback;
}

export function CogChoice({ 
  options,
  multiple = false,
  intent = 'primary',
  action,
  onAction,
  className 
}: CogChoiceProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(options.filter(o => o.selected).map(o => o.id))
  );

  const handleSelect = (optionId: string) => {
    const newSelected = new Set(selectedIds);
    
    if (multiple) {
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId);
      } else {
        newSelected.add(optionId);
      }
    } else {
      newSelected.clear();
      newSelected.add(optionId);
    }
    
    setSelectedIds(newSelected);
    
    if (action && onAction) {
      onAction({
        ...action,
        payload: {
          ...action.payload,
          selected: Array.from(newSelected),
          lastSelected: optionId,
        }
      });
    }
  };

  return (
    <AnimatedContainer className={cn('grid gap-3', className)}>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: options.length <= 3 ? `repeat(${options.length}, 1fr)` : 'repeat(2, 1fr)'
        }}
      >
        {options.map((option, index) => {
          const isSelected = selectedIds.has(option.id);
          
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(option.id)}
              className="group relative p-5 text-left transition-all duration-medium"
              style={{
                clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
              }}
            >
              {/* Background with hover states */}
              <div 
                className={cn(
                  'absolute inset-0 transition-all duration-medium',
                  isSelected 
                    ? 'bg-intent-primary/20' 
                    : 'bg-surface-glass/[0.04] group-hover:bg-surface-glass/[0.08]'
                )}
              />
              
              {/* Border with selection state */}
              <div 
                className={cn(
                  'absolute inset-0 border transition-all duration-medium',
                  isSelected 
                    ? `border-intent-${intent}/60 shadow-glow-${intent}/20` 
                    : 'border-intent-neutral/20 group-hover:border-intent-primary/40'
                )}
                style={{
                  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                }}
              />

              {/* Selection indicator - animated check */}
              <motion.div
                className={cn(
                  'absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center',
                  'transition-colors duration-medium',
                  isSelected 
                    ? `border-intent-${intent} bg-intent-${intent}` 
                    : 'border-intent-neutral/30 group-hover:border-intent-primary/50'
                )}
                animate={{ scale: isSelected ? 1 : 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-4 h-4 text-surface-void" />
                  </motion.div>
                )}
              </motion.div>
              
              {/* Content */}
              <div className="relative z-10 space-y-2">
                {option.icon && (
                  <span className="text-2xl mb-2 block">{option.icon}</span>
                )}
                
                <span className={cn(
                  'block font-medium text-sm',
                  isSelected ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {option.label}
                </span>
                
                {option.description && (
                  <span className="block text-xs text-text-muted leading-relaxed">
                    {option.description}
                  </span>
                )}
              </div>
              
              {/* Corner accents */}
              <div className={cn(
                'absolute top-0 left-0 w-2 h-2 border-t border-l transition-colors duration-medium',
                isSelected ? `border-intent-${intent}` : 'border-intent-neutral/30 group-hover:border-intent-primary/50'
              )} />
              <div className={cn(
                'absolute bottom-0 right-0 w-2 h-2 border-b border-r transition-colors duration-medium',
                isSelected ? `border-intent-${intent}` : 'border-intent-neutral/30 group-hover:border-intent-primary/50'
              )} />
              
              {/* Glow when selected */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 opacity-10 bg-gradient-to-r from-intent-primary/30 to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                />
              )}
              
              {/* Edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </motion.button>
          );
        })}
      </div>
    </AnimatedContainer>
  );
}