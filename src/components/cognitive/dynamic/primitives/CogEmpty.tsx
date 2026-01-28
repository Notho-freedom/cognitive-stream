// CogEmpty.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EmptyBlock, ActionCallback } from '../types';
import { Inbox, Search, Database } from 'lucide-react';
import { EmptyState, FuturisticButton, DataBar } from '../utils/components';

interface CogEmptyProps extends Omit<EmptyBlock, 'type'> {
  onAction?: ActionCallback;
}

const iconConfig = {
  default: { icon: Inbox, color: 'text-text-ghost' },
  search: { icon: Search, color: 'text-intent-primary' },
  data: { icon: Database, color: 'text-intent-secondary' },
};

export function CogEmpty({ 
  title = 'Aucune donnée',
  description,
  icon = 'default',
  action,
  onAction,
  className 
}: CogEmptyProps) {
  const config = typeof icon === 'string' ? iconConfig[icon as keyof typeof iconConfig] || iconConfig.default : iconConfig.default;
  const Icon = config.icon;

  const renderAction = () => {
    if (action && onAction) {
      return (
        <FuturisticButton
          variant="primary"
          onClick={() => onAction(action.action)}
          className="px-6 py-3 text-sm"
        >
          {action.label}
        </FuturisticButton>
      );
    }
    return null;
  };

  return (
    <EmptyState
      title={title}
      description={description}
      icon={<Icon className={cn("w-10 h-10", config.color)} />}
      action={renderAction()}
      className={className}
    >
      {/* Custom data bar for empty state */}
      <DataBar 
        items={[]}
        variant=""
        customData={[
          { label: 'STATE', value: 'EMPTY' },
          { label: 'VER', value: 'v1.0' }
        ]}
      />
    </EmptyState>
  );
}