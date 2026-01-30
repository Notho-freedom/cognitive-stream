import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StackBlock } from '../types';

interface CogStackProps extends Omit<StackBlock, 'type' | 'children'> {
  children: React.ReactNode;
  className?: string;
}

const gapStyles: Record<string, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignStyles: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function CogStack({ 
  direction = 'vertical', 
  gap = 'md', 
  align = 'stretch',
  children, 
  className 
}: CogStackProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        gapStyles[gap],
        alignStyles[align],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
