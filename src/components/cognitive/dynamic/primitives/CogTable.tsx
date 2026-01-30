import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ActionPayload } from '../types';

interface CogTableProps {
  headers: string[];
  rows: string[][];
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  selectable?: boolean;
  id?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogTable({
  headers,
  rows,
  striped = true,
  hoverable = true,
  compact = false,
  selectable = false,
  id,
  onAction,
}: CogTableProps) {
  const handleRowClick = (rowIndex: number, rowData: string[]) => {
    if (selectable && onAction && id) {
      onAction({
        id,
        payload: {
          actionType: 'table-row-select',
          rowIndex,
          rowData,
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-lg border border-white/5"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-elevated border-b border-white/10">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={cn(
                    'text-left font-medium text-ghost uppercase tracking-wider',
                    compact ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                className={cn(
                  'border-b border-white/5 last:border-0 transition-colors',
                  striped && rowIndex % 2 === 0 && 'bg-white/[0.02]',
                  hoverable && 'hover:bg-primary/5',
                  selectable && 'cursor-pointer'
                )}
                onClick={() => handleRowClick(rowIndex, row)}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      'text-primary-foreground',
                      compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {rows.length === 0 && (
        <div className="p-8 text-center text-ghost text-sm">
          Aucune donnée disponible
        </div>
      )}
    </motion.div>
  );
}
