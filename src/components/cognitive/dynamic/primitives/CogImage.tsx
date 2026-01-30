import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { ActionPayload } from '../types';

interface CogImageProps {
  src: string;
  alt?: string;
  caption?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '21:9';
  fit?: 'cover' | 'contain' | 'fill';
  rounded?: boolean;
  clickable?: boolean;
  actionId?: string;
  onAction?: (action: ActionPayload) => void;
}

const aspectRatioMap = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '21:9': 'aspect-[21/9]',
};

export function CogImage({
  src,
  alt = '',
  caption,
  aspectRatio = '16:9',
  fit = 'cover',
  rounded = true,
  clickable = false,
  actionId,
  onAction,
}: CogImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleClick = () => {
    if (clickable && actionId && onAction) {
      onAction({ id: actionId, payload: { actionType: 'image-click', src } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div
        className={cn(
          'relative overflow-hidden bg-surface-elevated border border-white/5',
          aspectRatioMap[aspectRatio],
          rounded && 'rounded-lg',
          clickable && 'cursor-pointer hover:border-primary/30 transition-colors'
        )}
        onClick={handleClick}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-elevated animate-pulse">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ghost">
            <ImageOff className="w-8 h-8" />
            <span className="text-xs">Image non disponible</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className={cn(
              'w-full h-full transition-opacity duration-300',
              fit === 'cover' && 'object-cover',
              fit === 'contain' && 'object-contain',
              fit === 'fill' && 'object-fill',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        )}
        
        {/* Corner accents GX */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/30" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/30" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/30" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/30" />
      </div>
      
      {caption && (
        <p className="text-xs text-ghost text-center italic">{caption}</p>
      )}
    </motion.div>
  );
}
