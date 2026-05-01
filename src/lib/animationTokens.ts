/**
 * animationTokens — Unified animation constants for the cognitive desktop.
 * All motion timing, easing, and visual feedback in one place.
 */

// Easing curves
export const EASE_COGNITIVE = [0.16, 1, 0.3, 1] as const;
export const EASE_SHARP = [0.4, 0, 0.2, 1] as const;
export const EASE_BOUNCE = [0.34, 1.56, 0.64, 1] as const;

// Duration tokens (seconds)
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  smooth: 0.4,
  slow: 0.6,
  ambient: 3,
} as const;

// Motion presets for Framer Motion
export const MOTION = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATION.normal, ease: EASE_COGNITIVE },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: DURATION.smooth, ease: EASE_COGNITIVE },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: DURATION.normal, ease: EASE_COGNITIVE },
  },
  slideRight: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
    transition: { duration: DURATION.normal, ease: EASE_COGNITIVE },
  },
} as const;

// Interactive feedback
export const FEEDBACK = {
  /** Subtle press feedback — scale down slightly */
  press: { scale: 0.97, transition: { duration: DURATION.instant } },
  /** Hover glow */
  hover: { scale: 1.02, transition: { duration: DURATION.fast } },
  /** Tap response */
  tap: { scale: 0.95 },
} as const;

// Glow pulse for status indicators
export const PULSE = {
  slow: {
    animate: { opacity: [0.4, 0.8, 0.4] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
  fast: {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
  },
  critical: {
    animate: { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] },
    transition: { duration: 0.8, repeat: Infinity },
  },
} as const;
