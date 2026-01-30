import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCognitiveForm } from '../CognitiveFormContext';
import type { ActionPayload } from '../types';

interface CogSliderProps {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  label?: string;
  showValue?: boolean;
  showMinMax?: boolean;
  suffix?: string;
  id?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogSlider({
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  label,
  showValue = true,
  showMinMax = true,
  suffix = '',
  id,
  onAction,
}: CogSliderProps) {
  const [value, setValue] = useState(defaultValue ?? min);
  const formContext = useCognitiveForm();

  const percentage = ((value - min) / (max - min)) * 100;

  // Sync with form context
  useEffect(() => {
    if (id && formContext) {
      formContext.setFieldValue(id, value);
    }
  }, [id, value, formContext]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    
    if (onAction && id) {
      onAction({
        id,
        payload: { actionType: 'slider-change', value: newValue },
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Label and value */}
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-xs text-ghost uppercase tracking-wider">{label}</span>
        )}
        {showValue && (
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-mono text-primary"
          >
            {value}{suffix}
          </motion.span>
        )}
      </div>

      {/* Slider track */}
      <div className="relative h-8 flex items-center">
        {/* Custom track */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-white/5 overflow-hidden">
          {/* Filled portion */}
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/60"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Native range input (hidden visually but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={cn(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
            '[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5'
          )}
        />

        {/* Custom thumb */}
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/30 pointer-events-none"
          style={{ left: `calc(${percentage}% - 10px)` }}
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Pulse effect */}
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
        </motion.div>
      </div>

      {/* Min/Max labels */}
      {showMinMax && (
        <div className="flex items-center justify-between text-xs text-ghost">
          <span>{min}{suffix}</span>
          <span>{max}{suffix}</span>
        </div>
      )}
    </div>
  );
}
