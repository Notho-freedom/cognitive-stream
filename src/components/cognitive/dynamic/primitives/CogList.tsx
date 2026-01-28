// CogList.tsx
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ListBlock, ActionCallback } from '../types';
import { useState } from 'react';
import { FuturisticFrame } from '../../FuturisticFrame';
import {
  CognitiveHeader,
  DataBar,
  ListItem,
  FuturisticButton,
  AnimatedContainer
} from '../utils/components';

interface CogListProps extends Omit<ListBlock, 'type'> {
  title?: string;
  description?: string;
  onAction?: ActionCallback;
}

export function CogList({ 
  items, 
  variant = 'bullet',
  intent = 'primary',
  selectable = false,
  title,
  description,
  onAction,
  className 
}: CogListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.filter(i => i.selected).map(i => i.id))
  );
  const [isHovered, setIsHovered] = useState(false);

  const handleItemClick = (item: typeof items[0]) => {
    if (selectable) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedIds(newSelected);
    }
    
    if (item.action && onAction) {
      onAction({
        ...item.action,
        payload: {
          ...item.action.payload,
          selected: !selectedIds.has(item.id),
        }
      });
    }
  };

  return (
    <AnimatedContainer
      className={cn('max-w-lg', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FuturisticFrame variant="primary" animated={isHovered}>
        <div className="p-6">
          {/* Header */}
          <CognitiveHeader
            title={title}
            description={description}
            variant={variant}
            selectable={selectable}
            intent={intent}
          />

          {/* Zone de contenu - LA LISTE */}
          <div className="min-h-[60px] mb-5">
            <div className={cn(
              'space-y-0',
              variant === 'inline' && 'flex flex-wrap gap-2'
            )}>
              {items.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isLast = index === items.length - 1;
                
                return (
                  <ListItem
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={isSelected}
                    variant={variant}
                    selectable={selectable}
                    onClick={() => handleItemClick(item)}
                    intent={intent}
                    isLast={isLast}
                  />
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <AnimatePresence>
            {selectable && selectedIds.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex justify-end gap-3 pt-4 border-t border-intent-primary/10"
              >
                <FuturisticButton variant="secondary">
                  Annuler
                </FuturisticButton>
                <FuturisticButton variant="primary">
                  Confirmer ({selectedIds.size})
                </FuturisticButton>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom data bar */}
          <DataBar items={items} variant={variant} intent={intent} />
        </div>
      </FuturisticFrame>
    </AnimatedContainer>
  );
}