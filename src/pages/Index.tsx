import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponseCard, ResponseState } from '@/components/cognitive';

const DEMO_RESPONSES = [
  "Analyse terminée. J'ai identifié 3 patterns récurrents dans vos données. Voulez-vous que je génère un rapport détaillé ?",
  "Connexion établie avec le réseau neural. Latence optimale détectée.",
  "Scan environnemental complet. Aucune anomalie détectée dans le périmètre.",
];

const states: ResponseState[] = ['idle', 'listening', 'thinking', 'responding', 'complete'];

export default function Index() {
  const [currentStateIndex, setCurrentStateIndex] = useState(3); // Start at 'responding'
  const [showCard, setShowCard] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  const cycleState = () => {
    setCurrentStateIndex(i => (i + 1) % states.length);
  };

  const resetCard = () => {
    setShowCard(false);
    setTimeout(() => {
      setMessageIndex(i => (i + 1) % DEMO_RESPONSES.length);
      setCurrentStateIndex(3);
      setShowCard(true);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 overflow-hidden">
      {/* Minimal ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-sm uppercase tracking-[0.3em] text-text-ghost font-light mb-2">
            Cognitive HUD
          </h1>
          <p className="text-xs text-text-ghost/60 font-mono">
            RESPONSE.CARD.PROTOTYPE.v1
          </p>
        </motion.div>

        {/* Response Card Demo */}
        <div className="flex justify-center mb-12">
          <AnimatePresence mode="wait">
            {showCard && (
              <ResponseCard
                key={messageIndex}
                text={DEMO_RESPONSES[messageIndex]}
                state={states[currentStateIndex]}
                showAction
                actionLabel="Générer"
                onAction={() => {
                  console.log('Action triggered');
                  resetCard();
                }}
                onDismiss={() => setShowCard(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={cycleState}
            className="px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-text-secondary transition-colors border border-intent-neutral/20 hover:border-intent-primary/40"
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            State: {states[currentStateIndex]}
          </button>

          <button
            onClick={resetCard}
            className="px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-intent-primary transition-colors border border-intent-neutral/20 hover:border-intent-primary/40"
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            Reset Card
          </button>
        </motion.div>
      </div>
    </div>
  );
}