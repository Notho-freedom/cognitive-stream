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
      className="relative overflow-hidden rounded-lg border border-[hsl(var(--border))]"
    >
      {/* Corner accents GX */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[hsl(var(--intent-primary)/0.5)] pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[hsl(var(--intent-primary)/0.5)] pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[hsl(var(--intent-primary)/0.5)] pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[hsl(var(--intent-primary)/0.5)] pointer-events-none z-10" />
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[hsl(var(--surface-elevated))] border-b border-[hsl(var(--border))]">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={cn(
                    'text-left font-medium uppercase tracking-wider',
                    'text-[hsl(var(--intent-primary))]',
                    compact ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3 bg-[hsl(var(--intent-primary)/0.4)] rounded-full" />
                    {header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[hsl(var(--surface-deep))]">
            {rows.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIndex * 0.03, duration: 0.2 }}
                className={cn(
                  'border-b border-[hsl(var(--border)/0.5)] last:border-0 transition-all duration-200',
                  striped && rowIndex % 2 === 0 && 'bg-[hsl(var(--surface-glass)/0.3)]',
                  hoverable && 'hover:bg-[hsl(var(--intent-primary)/0.08)]',
                  selectable && 'cursor-pointer'
                )}
                onClick={() => handleRowClick(rowIndex, row)}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      'text-[hsl(var(--text-primary))]',
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
        <div className="p-8 text-center bg-[hsl(var(--surface-deep))]">
          <div className="text-[hsl(var(--text-ghost))] text-sm font-mono uppercase tracking-wider">
            [ Aucune donnée disponible ]
          </div>
        </div>
      )}
      
      {/* Bottom scan line effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--intent-primary)/0.3)] to-transparent" />
    </motion.div>
  );
}
