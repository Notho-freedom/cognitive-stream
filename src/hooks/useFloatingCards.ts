import { useState, useCallback, useRef } from 'react';
import type { FloatingCard } from '@/components/desktop/FloatingResponseCard';
import type { CognitiveUISchema } from '@/components/cognitive/dynamic/types';

/**
 * useFloatingCards — Gère la pile de cartes flottantes au centre de l'écran
 * Chaque réponse/erreur/action crée une carte séparée
 */

const DEFAULT_DISMISS_MS = 8000; // 8 secondes par défaut
const ERROR_DISMISS_MS = 12000;
const ACTION_DISMISS_MS = 0; // Les actions ne se ferment pas auto

let cardIdCounter = 0;
function nextCardId() {
  return `card_${Date.now()}_${++cardIdCounter}`;
}

export function useFloatingCards() {
  const [cards, setCards] = useState<FloatingCard[]>([]);
  const maxCards = useRef(5); // Max visible cards

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

  // Convenience methods
  const pushResponse = useCallback((text: string, autoDismissMs?: number) => {
    return pushCard('response', { text, autoDismissMs });
  }, [pushCard]);

  const pushSchema = useCallback((schema: CognitiveUISchema, autoDismissMs?: number) => {
    // Schemas with interactive elements should stay until dismissed
    return pushCard('response', { schema, autoDismissMs: autoDismissMs ?? 0 });
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
  };
}
