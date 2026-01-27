import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponseCard, 
  ResponseState, 
  NotificationProvider, 
  NotificationQueue, 
  useNotifications,
  NotificationPriority,
  CommandInput,
} from '@/components/cognitive';

const DEMO_RESPONSES = [
  "Analyse terminée. J'ai identifié 3 patterns récurrents dans vos données. Voulez-vous que je génère un rapport détaillé ?",
  "Connexion établie avec le réseau neural. Latence optimale détectée.",
  "Scan environnemental complet. Aucune anomalie détectée dans le périmètre.",
];

const states: ResponseState[] = ['idle', 'listening', 'thinking', 'responding', 'complete'];

// Demo notifications
const DEMO_NOTIFICATIONS: Array<{ message: string; priority: NotificationPriority; action?: { label: string } }> = [
  { message: "Nouvelle connexion détectée sur le réseau neural.", priority: 'low' },
  { message: "Mise à jour du système cognitif disponible.", priority: 'medium', action: { label: 'Installer' } },
  { message: "Anomalie détectée dans le flux de données.", priority: 'high', action: { label: 'Analyser' } },
  { message: "⚠️ Breach de sécurité potentielle identifiée.", priority: 'critical', action: { label: 'Intervention' } },
];

function DemoControls() {
  const { push, clear } = useNotifications();
  const [notifIndex, setNotifIndex] = useState(0);

  const addNotification = () => {
    const demo = DEMO_NOTIFICATIONS[notifIndex];
    push({
      message: demo.message,
      priority: demo.priority,
      action: demo.action ? { label: demo.action.label, onClick: () => console.log('Action!') } : undefined,
    });
    setNotifIndex(i => (i + 1) % DEMO_NOTIFICATIONS.length);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={addNotification}
        className="px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-intent-primary transition-colors border border-intent-neutral/20 hover:border-intent-primary/40"
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      >
        + Notification
      </button>
      <button
        onClick={clear}
        className="px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-intent-focus transition-colors border border-intent-neutral/20 hover:border-intent-focus/40"
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}
      >
        Clear All
      </button>
    </div>
  );
}

function DemoContent() {
  const [currentStateIndex, setCurrentStateIndex] = useState(3);
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
    <>
      {/* Notification Queue */}
      <NotificationQueue position="top-right" />
      
      {/* Command Input (Cmd/Ctrl + K) */}
      <CommandInput 
        onSubmit={(query) => console.log('Search:', query)}
        onSelect={(s) => console.log('Selected:', s.label)}
      />

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
            RESPONSE.CARD + NOTIFICATION.QUEUE
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
          className="flex flex-col items-center gap-4"
        >
          {/* Card controls */}
          <div className="flex gap-3">
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
          </div>

          {/* Notification controls */}
          <DemoControls />
        </motion.div>
      </div>
    </>
  );
}

export default function Index() {
  return (
    <NotificationProvider>
      <div className="min-h-screen flex items-center justify-center p-8 overflow-hidden">
        {/* Minimal ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
        </div>

        <DemoContent />
      </div>
    </NotificationProvider>
  );
}
