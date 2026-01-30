import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { CognitiveBlock, ActionPayload } from '../types';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
  children: CognitiveBlock[];
}

interface CogTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  id?: string;
  onAction?: (action: ActionPayload) => void;
  renderBlock?: (block: CognitiveBlock, onAction?: (action: ActionPayload) => void, key?: string | number) => React.ReactNode;
}

export function CogTabs({
  tabs,
  defaultTab,
  variant = 'default',
  id,
  onAction,
  renderBlock,
}: CogTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'tab-change', tabId },
      });
    }
  };

  const activeTabContent = tabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Tab headers */}
      <div
        className={cn(
          'flex gap-1 overflow-x-auto scrollbar-none',
          variant === 'default' && 'bg-surface-elevated/50 p-1 rounded-lg border border-white/5',
          variant === 'underline' && 'border-b border-white/10'
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'relative px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                
                // Default variant
                variant === 'default' && [
                  'rounded-md',
                  isActive
                    ? 'bg-primary/20 text-primary shadow-sm'
                    : 'text-ghost hover:text-primary hover:bg-white/5'
                ],
                
                // Pills variant
                variant === 'pills' && [
                  'rounded-full border',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-white/10 text-ghost hover:border-primary/50 hover:text-primary'
                ],
                
                // Underline variant
                variant === 'underline' && [
                  'pb-3',
                  isActive ? 'text-primary' : 'text-ghost hover:text-primary'
                ]
              )}
            >
              {tab.label}
              
              {/* Active indicator for underline variant */}
              {variant === 'underline' && isActive && (
                <motion.div
                  layoutId={`tab-indicator-${id}`}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {activeTabContent?.children.map((block, i) =>
            renderBlock ? renderBlock(block, onAction, i) : null
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
