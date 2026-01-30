import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GridBlock } from '../types';

interface CogGridProps extends Omit<GridBlock, 'type' | 'children'> {
  children: React.ReactNode;
  className?: string;
}

const columnStyles: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const gapStyles: Record<string, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function CogGrid({ 
  columns = 2, 
  gap = 'md', 
  children, 
  className 
}: CogGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'grid',
        columnStyles[columns],
        gapStyles[gap || 'md'],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
