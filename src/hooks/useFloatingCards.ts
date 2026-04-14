import { useState, useCallback, useRef } from 'react';
import type { FloatingCard } from '@/components/desktop/FloatingResponseCard';
import type { CognitiveUISchema } from '@/components/cognitive/dynamic/types';

/**
 * useFloatingCards — Gère la pile de cartes flottantes au centre de l'écran
 * Chaque réponse/erreur/action crée une carte séparée
 */

const DEFAULT_DISMISS_MS = 10000;
const ERROR_DISMISS_MS = 8500;
const ACTION_DISMISS_MS = 7000;
const CARD_WIDTH = 540;
const CARD_HEIGHT = 320;
const VIEWPORT_MARGIN = 40;

let cardIdCounter = 0;
function nextCardId() {
  return `card_${Date.now()}_${++cardIdCounter}`;
}

export function useFloatingCards() {
  const [cards, setCards] = useState<FloatingCard[]>([]);
  const maxCards = useRef(5); // Max visible cards
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const zIndexRef = useRef(200);

  const getViewport = () => {
    if (typeof window === 'undefined') {
      return { width: 1280, height: 720 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const computeNextPosition = () => {
    const { width, height } = getViewport();
    const maxX = Math.max(VIEWPORT_MARGIN, width - CARD_WIDTH - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, height - CARD_HEIGHT - VIEWPORT_MARGIN);

    const base = lastPositionRef.current ?? {
      x: clamp((width - CARD_WIDTH) / 2, VIEWPORT_MARGIN, maxX),
      y: clamp((height - CARD_HEIGHT) / 2, VIEWPORT_MARGIN, maxY),
    };

    const angle = Math.random() * Math.PI * 2;
    const radius = 70 + Math.random() * 90;
    const next = {
      x: clamp(base.x + Math.cos(angle) * radius, VIEWPORT_MARGIN, maxX),
      y: clamp(base.y + Math.sin(angle) * radius, VIEWPORT_MARGIN, maxY),
    };

    lastPositionRef.current = next;
    return next;
  };

  const pushCard = useCallback((
    type: FloatingCard['type'],
    options: {
      schema?: CognitiveUISchema;
      text?: string;
      error?: string;
      autoDismissMs?: number;
    },
  ): string => {
    const id = nextCardId();

    const defaultDismiss =
      type === 'error' ? ERROR_DISMISS_MS :
      type === 'action' ? ACTION_DISMISS_MS :
      DEFAULT_DISMISS_MS;

    const card: FloatingCard = {
      id,
      type,
      schema: options.schema,
      text: options.text,
      error: options.error,
      autoDismissMs: options.autoDismissMs ?? defaultDismiss,
      timestamp: Date.now(),
      position: computeNextPosition(),
      zIndex: zIndexRef.current++,
    };

    setCards(prev => {
      const next = [...prev, card];
      // Trim oldest if exceeding max
      if (next.length > maxCards.current) {
        return next.slice(next.length - maxCards.current);
      }
      return next;
    });

    return id;
  }, []);

  const dismissCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setCards([]);
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<FloatingCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setCards(prev => prev.map(card => (
      card.id === id ? { ...card, zIndex: zIndexRef.current++ } : card
    )));
  }, []);

  // Convenience methods
  const pushResponse = useCallback((text: string, autoDismissMs?: number) => {
    return pushCard('response', { text, autoDismissMs });
  }, [pushCard]);

  const pushSchema = useCallback((schema: CognitiveUISchema, autoDismissMs?: number) => {
    return pushCard('response', { schema, autoDismissMs: autoDismissMs ?? DEFAULT_DISMISS_MS });
  }, [pushCard]);

  const pushError = useCallback((error: string) => {
    return pushCard('error', { error });
  }, [pushCard]);

  const pushAction = useCallback((text: string, schema?: CognitiveUISchema) => {
    return pushCard('action', { text, schema });
  }, [pushCard]);

  const pushThought = useCallback((text: string) => {
    return pushCard('thought', { text, autoDismissMs: 5000 });
  }, [pushCard]);

  return {
    cards,
    pushCard,
    pushResponse,
    pushSchema,
    pushError,
    pushAction,
    pushThought,
    dismissCard,
    dismissAll,
    updateCard,
    bringToFront,
  };
}
