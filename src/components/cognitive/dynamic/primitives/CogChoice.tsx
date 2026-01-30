import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChoiceBlock, ActionPayload } from '../types';

interface CogChoiceProps extends Omit<ChoiceBlock, 'type'> {
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogChoice({ 
  id, 
  options, 
  multiple = false, 
  defaultValue,
  className,
  onAction 
}: CogChoiceProps) {
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  const handleSelect = (value: string) => {
    let newSelected: string[];
    
    if (multiple) {
      newSelected = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value];
    } else {
      newSelected = [value];
    }
    
    setSelected(newSelected);
    
    // Envoi automatique pour les choix
    onAction?.({ 
      id, 
      payload: { 
        actionType: 'choice-select', // Auto-submit
        value: multiple ? newSelected : newSelected[0] 
      } 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-2', className)}
    >
      {options.map((option, i) => {
        const isSelected = selected.includes(option.value);
        
        return (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'w-full relative flex items-start gap-3 p-3 text-left transition-all duration-200',
              'border bg-surface-raised/20 hover:bg-surface-raised/40',
              isSelected ? 'border-intent-primary/60' : 'border-intent-neutral/20',
            )}
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            {/* Indicator */}
            <div className={cn(
              'w-4 h-4 flex-shrink-0 mt-0.5 border transition-all duration-200',
              multiple ? 'rounded-sm' : 'rounded-full',
              isSelected ? 'border-intent-primary bg-intent-primary/30' : 'border-intent-neutral/40',
            )}>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'w-full h-full flex items-center justify-center',
                    multiple ? '' : 'rounded-full'
                  )}
                >
                  {multiple ? (
                    <svg className="w-3 h-3 text-intent-primary" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-intent-primary rounded-full" />
                  )}
                </motion.div>
              )}
            </div>
            
            <div className="flex-1">
              <span className={cn(
                'block text-sm tracking-wide transition-colors',
                isSelected ? 'text-text-primary' : 'text-text-secondary',
              )}>
                {option.label}
              </span>
              {option.description && (
                <span className="block text-xs text-text-ghost mt-0.5">
                  {option.description}
                </span>
              )}
            </div>
            
            {/* Selection glow */}
            {isSelected && (
              <motion.div
                layoutId={`choice-glow-${id}`}
                className="absolute inset-0 pointer-events-none"
                style={{
                  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                  boxShadow: '0 0 20px hsl(var(--intent-primary) / 0.1)',
                }}
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
