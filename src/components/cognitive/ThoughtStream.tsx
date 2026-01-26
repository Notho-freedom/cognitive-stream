import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ThoughtStreamProps {
  text: string;
  speed?: 'slow' | 'normal' | 'fast' | 'adaptive';
  className?: string;
  onComplete?: () => void;
  isStreaming?: boolean;
}

const speedConfig = {
  slow: 80,
  normal: 40,
  fast: 20,
  adaptive: 35,
};

export function ThoughtStream({ 
  text, 
  speed = 'adaptive',
  className,
  onComplete,
  isStreaming = true,
}: ThoughtStreamProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const indexRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      onComplete?.();
      return;
    }

    indexRef.current = 0;
    completedRef.current = false;
    setDisplayedText('');

    const baseDelay = speedConfig[speed];
    
    const streamText = () => {
      if (indexRef.current < text.length) {
        const char = text[indexRef.current];
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;

        // Adaptive timing based on punctuation
        let delay = baseDelay;
        if (speed === 'adaptive') {
          if (['.', '!', '?'].includes(char)) delay = 200;
          else if ([',', ';', ':'].includes(char)) delay = 100;
          else if (char === ' ' && text[indexRef.current - 2] === '.') delay = 150;
        }

        setTimeout(streamText, delay);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    const timeoutId = setTimeout(streamText, 100);
    return () => clearTimeout(timeoutId);
  }, [text, speed, isStreaming, onComplete]);

  // Cursor blink
  useEffect(() => {
    if (!isStreaming || displayedText === text) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [isStreaming, displayedText, text]);

  return (
    <div className={cn('relative', className)}>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-text-primary font-light leading-relaxed tracking-wide"
      >
        {displayedText.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {char}
          </motion.span>
        ))}
        
        {/* Cursor */}
        <AnimatePresence>
          {cursorVisible && displayedText !== text && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-block w-0.5 h-5 bg-intent-primary ml-0.5 -mb-1"
            />
          )}
        </AnimatePresence>
      </motion.p>

      {/* Thinking shimmer when waiting for more text */}
      {isStreaming && displayedText.length > 0 && displayedText !== text && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scaleX: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}