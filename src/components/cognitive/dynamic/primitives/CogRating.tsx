import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCognitiveForm } from '../CognitiveFormContext';
import type { ActionPayload } from '../types';

interface CogRatingProps {
  max?: number;
  defaultValue?: number;
  label?: string;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  onAction?: (action: ActionPayload) => void;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function CogRating({
  max = 5,
  defaultValue = 0,
  label,
  readonly = false,
  size = 'md',
  id,
  onAction,
}: CogRatingProps) {
  const [value, setValue] = useState(defaultValue);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const formContext = useCognitiveForm();

  // Sync with form context
  useEffect(() => {
    if (id && formContext) {
      formContext.setFieldValue(id, value);
    }
  }, [id, value, formContext]);

  const handleClick = (rating: number) => {
    if (readonly) return;
    
    setValue(rating);
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'rating-change', value: rating },
      });
    }
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-xs text-ghost uppercase tracking-wider">{label}</span>
      )}
      
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= displayValue;
          
          return (
            <motion.button
              key={i}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => !readonly && setHoverValue(starValue)}
              onMouseLeave={() => setHoverValue(null)}
              whileHover={!readonly ? { scale: 1.1 } : undefined}
              whileTap={!readonly ? { scale: 0.95 } : undefined}
              className={cn(
                'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded',
                readonly ? 'cursor-default' : 'cursor-pointer'
              )}
            >
              <Star
                className={cn(
                  sizeMap[size],
                  'transition-all duration-200',
                  isFilled
                    ? 'fill-intent-warning text-intent-warning'
                    : 'text-white/20 hover:text-white/40'
                )}
              />
            </motion.button>
          );
        })}
        
        <span className="ml-2 text-sm text-ghost">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}
