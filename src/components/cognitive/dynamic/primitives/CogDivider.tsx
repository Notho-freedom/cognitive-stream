// CogDivider.tsx
import { cn } from '@/lib/utils';
import { DividerBlock } from '../types';
import { TechDivider, PulseIndicator } from '../utils/components';

interface CogDividerProps extends Omit<DividerBlock, 'type'> {
  label?: string;
}

export function CogDivider({ label, intent = 'primary', className }: CogDividerProps) {
  return (
    <TechDivider label={label} intent={intent} className={className}>
      {/* Pulsing dots decoration */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <PulseIndicator
              key={i}
              size="sm"
              intent={intent}
            />
          ))}
        </div>
      </div>
    </TechDivider>
  );
}