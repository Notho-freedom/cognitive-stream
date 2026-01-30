import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ListBlock, ActionPayload } from '../types';

interface CogListProps extends Omit<ListBlock, 'type'> {
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogList({ 
  id, 
  items, 
  variant = 'bullet', 
  selectable = false, 
  className,
  onAction 
}: CogListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number, item: string) => {
    if (!selectable) return;
    setSelectedIndex(index);
    
    // Envoyer l'action avec le type list-select (nécessite confirmation manuelle)
    onAction?.({ 
      id: id || 'list', 
      payload: { 
        actionType: 'list-select', // Type d'action pour identification
        index, 
        item 
      } 
    });
  };

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'space-y-2',
        variant === 'tags' && 'flex flex-wrap gap-2 space-y-0',
        className
      )}
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => handleSelect(i, item)}
          className={cn(
            'relative flex items-start gap-3 text-sm text-text-primary tracking-wide',
            variant === 'tags' && 'inline-flex px-3 py-1.5 text-xs uppercase tracking-wider border border-intent-primary/30 bg-intent-primary/5',
            selectable && 'cursor-pointer transition-all duration-200 hover:text-intent-primary',
            selectable && selectedIndex === i && 'text-intent-primary',
          )}
          style={variant === 'tags' ? { clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' } : undefined}
        >
          {variant === 'bullet' && (
            <motion.span 
              className="w-1.5 h-1.5 mt-1.5 bg-intent-primary rounded-full flex-shrink-0"
              animate={selectedIndex === i ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          )}
          {variant === 'numbered' && (
            <span className="text-intent-primary font-mono text-xs w-6 flex-shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
          )}
          <span className="font-light">{item}</span>
          
          {selectable && selectedIndex === i && (
            <motion.div
              layoutId="list-selection"
              className="absolute inset-0 border border-intent-primary/40 pointer-events-none"
              style={{ clipPath: variant === 'tags' ? 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' : undefined }}
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}
