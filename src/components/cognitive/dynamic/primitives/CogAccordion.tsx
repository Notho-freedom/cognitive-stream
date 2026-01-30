import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { CognitiveBlock, ActionPayload } from '../types';

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  children: CognitiveBlock[];
}

interface CogAccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: string[];
  variant?: 'default' | 'bordered' | 'ghost';
  id?: string;
  onAction?: (action: ActionPayload) => void;
  renderBlock?: (block: CognitiveBlock, onAction?: (action: ActionPayload) => void, key?: string | number) => React.ReactNode;
}

export function CogAccordion({
  items,
  multiple = false,
  defaultOpen = [],
  variant = 'default',
  id,
  onAction,
  renderBlock,
}: CogAccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      return multiple ? [...prev, itemId] : [itemId];
    });

    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'accordion-toggle', itemId },
      });
    }
  };

  return (
    <div
      className={cn(
        'space-y-2',
        variant === 'bordered' && 'border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5'
      )}
    >
      {items.map((item, index) => {
        const isOpen = openItems.includes(item.id);
        
        return (
          <div
            key={item.id}
            className={cn(
              variant === 'default' && 'bg-surface-elevated/50 rounded-lg border border-white/5 overflow-hidden',
              variant === 'ghost' && 'border-b border-white/5 last:border-0',
              variant === 'bordered' && 'first:rounded-t-lg last:rounded-b-lg'
            )}
          >
            {/* Header */}
            <button
              onClick={() => toggleItem(item.id)}
              className={cn(
                'w-full flex items-center justify-between gap-4 text-left transition-colors',
                'px-4 py-3',
                isOpen ? 'bg-primary/5' : 'hover:bg-white/5'
              )}
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-primary-foreground truncate">
                  {item.title}
                </h4>
                {item.subtitle && (
                  <p className="text-xs text-ghost mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
              
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <ChevronDown className="w-4 h-4 text-ghost" />
              </motion.div>
            </button>

            {/* Content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                    <div className="pt-3 space-y-4">
                      {item.children.map((block, i) =>
                        renderBlock ? renderBlock(block, onAction, i) : null
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
