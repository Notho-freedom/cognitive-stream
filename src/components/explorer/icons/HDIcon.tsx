import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { isIconReady, isIconErrored, preloadIcon } from '@/lib/iconCache';

interface HDIconProps {
  src: string;
  size?: number;
  alt?: string;
  className?: string;
  fallbackEmoji?: string;
}

/**
 * HD icon with cache-aware preload + emoji fallback. Avoids flicker on revisit.
 */
export function HDIcon({ src, size = 24, alt = '', className = '', fallbackEmoji = '📎' }: HDIconProps) {
  const [ready, setReady] = useState(() => isIconReady(src));
  const [errored, setErrored] = useState(() => isIconErrored(src));

  useEffect(() => {
    if (!src) return;
    if (isIconReady(src)) { setReady(true); setErrored(false); return; }
    if (isIconErrored(src)) { setErrored(true); return; }
    let cancelled = false;
    preloadIcon(src).then(ok => {
      if (cancelled) return;
      if (ok) setReady(true); else setErrored(true);
    });
    return () => { cancelled = true; };
  }, [src]);

  if (errored || !src) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn('shrink-0 leading-none select-none inline-block text-center', className)}
        style={{ fontSize: `${Math.round(size * 0.85)}px`, lineHeight: 1, width: size, height: size }}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onLoad={() => setReady(true)}
      onError={() => setErrored(true)}
      className={cn('shrink-0 select-none object-contain transition-opacity duration-150', className, ready ? 'opacity-100' : 'opacity-0')}
      style={{ width: size, height: size }}
    />
  );
}
