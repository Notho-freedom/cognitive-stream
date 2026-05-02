import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

/**
 * Wallpaper slideshow hook.
 * Supports: single image URL, or array of image URLs with timed rotation.
 * Stored in settings: wallpaperPreset, wallpaperCustomUrl, wallpaperSlideshow, wallpaperSlideshowInterval
 */

export function useWallpaperSlideshow() {
  const { settings, update } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const images = settings.wallpaperSlideshow ?? [];
  const interval = (settings.wallpaperSlideshowInterval ?? 5) * 60 * 1000; // minutes -> ms

  // Rotation
  useEffect(() => {
    if (images.length < 2) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, interval]);

  const currentImage = images.length > 0 ? images[currentIndex % images.length] : null;

  const addImages = useCallback((urls: string[]) => {
    const next = [...(settings.wallpaperSlideshow ?? []), ...urls];
    update('wallpaperSlideshow', next);
    update('wallpaperPreset', 'slideshow');
  }, [settings.wallpaperSlideshow, update]);

  const clearSlideshow = useCallback(() => {
    update('wallpaperSlideshow', []);
    update('wallpaperPreset', 'cyan-void');
  }, [update]);

  const setInterval_ = useCallback((minutes: number) => {
    update('wallpaperSlideshowInterval', minutes);
  }, [update]);

  return {
    currentImage,
    images,
    currentIndex,
    addImages,
    clearSlideshow,
    setIntervalMinutes: setInterval_,
    intervalMinutes: settings.wallpaperSlideshowInterval ?? 5,
  };
}
