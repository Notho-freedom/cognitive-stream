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
import { 
  CognitiveRenderer, 
  CognitiveUISchema, 
  CognitiveAction 
} from '@/components/cognitive/dynamic';
import {
  countriesListExample,
  questionFormExample,
  dashboardExample,
  loadingExample,
  emptyExample,
  
} from '@/components/cognitive/dynamic/examples';

const DEMO_RESPONSES = [
  "Analyse terminée. J'ai identifié 3 patterns récurrents dans vos données. Voulez-vous que je génère un rapport détaillé ?",
  "Connexion établie avec le réseau neural. Latence optimale détectée.",
  "Scan environnemental complet. Aucune anomalie détectée dans le périmètre.",
];

const states: ResponseState[] = ['idle', 'listening', 'thinking', 'responding', 'complete'];

const DEMO_NOTIFICATIONS: Array<{ message: string; priority: NotificationPriority; action?: { label: string } }> = [
  { message: "Nouvelle connexion détectée sur le réseau neural.", priority: 'low' },
  { message: "Mise à jour du système cognitif disponible.", priority: 'medium', action: { label: 'Installer' } },
  { message: "Anomalie détectée dans le flux de données.", priority: 'high', action: { label: 'Analyser' } },
  { message: "⚠️ Breach de sécurité potentielle identifiée.", priority: 'critical', action: { label: 'Intervention' } },
];

// Schémas de démo pour le système dynamique
const DEMO_SCHEMAS: { label: string; schema: CognitiveUISchema }[] = [
  { label: 'Liste pays', schema: countriesListExample },
  { label: 'Question', schema: questionFormExample },
  { label: 'Dashboard', schema: dashboardExample },
  { label: 'Loading', schema: loadingExample },
  { label: 'Empty', schema: emptyExample },

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

function DynamicUIDemo() {
  const [selectedSchemaIndex, setSelectedSchemaIndex] = useState(0);
  const [actionLog, setActionLog] = useState<CognitiveAction[]>([]);

  const handleAction = (action: CognitiveAction) => {
    console.log('🎯 Action:', action);
    setActionLog(prev => [action, ...prev].slice(0, 5));
  };

  const currentSchema = DEMO_SCHEMAS[selectedSchemaIndex];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-xs uppercase tracking-[0.3em] text-text-ghost font-light mb-1">
          Dynamic UI System
        </h2>
        <p className="text-[10px] text-text-ghost/50 font-mono">
          JSON → COMPONENTS
        </p>
      </motion.div>

      {/* Schema selector */}
      <div className="flex justify-center gap-2 flex-wrap">
        {DEMO_SCHEMAS.map((demo, index) => (
          <button
            key={demo.label}
            onClick={() => setSelectedSchemaIndex(index)}
            className={`
              px-3 py-1.5 text-xs uppercase tracking-wider transition-all
              border rounded-sm
              ${index === selectedSchemaIndex 
                ? 'text-intent-primary border-intent-primary/50 bg-intent-primary/10' 
                : 'text-text-ghost border-intent-neutral/20 hover:border-intent-primary/30'
              }
            `}
          >
            {demo.label}
          </button>
        ))}
      </div>

      {/* Rendered UI */}
      <motion.div
        key={selectedSchemaIndex}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="p-6 rounded-cognitive bg-surface-glass/[0.04]"
      >
        <CognitiveRenderer 
          schema={currentSchema.schema} 
          onAction={handleAction}
        />
      </motion.div>

      {/* Action log */}
      <AnimatePresence mode="popLayout">
        {actionLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="text-xs text-text-ghost uppercase tracking-wider mb-2">
              Actions reçues:
            </div>
            <div className="space-y-1">
              {actionLog.map((action, i) => (
                <motion.div
                  key={`${action.id}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-mono text-text-muted p-2 bg-surface-glass/[0.04] rounded border border-intent-neutral/10"
                >
                  <span className="text-intent-primary">{action.id}</span>
                  {action.payload && (
                    <span className="text-text-ghost ml-2">
                      {JSON.stringify(action.payload)}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegacyDemoContent() {
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
    <div className="w-full max-w-2xl mx-auto">
      {/* Response Card Demo */}
      <div className="flex justify-center mb-8">
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
        <DemoControls />
      </motion.div>
    </div>
  );
}

function DemoContent() {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'legacy'>('dynamic');

  return (
    <>
      {/* Notification Queue */}
      <NotificationQueue position="top-right" />
      
      {/* Command Input (Cmd/Ctrl + K) */}
      <CommandInput 
        onSubmit={(query) => console.log('Search:', query)}
        onSelect={(s) => console.log('Selected:', s.label)}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Main Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-sm uppercase tracking-[0.3em] text-text-ghost font-light mb-2">
            Cognitive HUD
          </h1>
          <p className="text-xs text-text-ghost/60 font-mono">
            SYSTEM.COMPONENTS.DYNAMIC
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-4 mb-10">
          <button
            onClick={() => setActiveTab('dynamic')}
            className={`
              px-5 py-2 text-xs uppercase tracking-wider transition-all
              border
              ${activeTab === 'dynamic' 
                ? 'text-intent-primary border-intent-primary/50 bg-intent-primary/10' 
                : 'text-text-ghost border-intent-neutral/20 hover:border-intent-primary/30'
              }
            `}
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            🧩 Dynamic UI
          </button>
          <button
            onClick={() => setActiveTab('legacy')}
            className={`
              px-5 py-2 text-xs uppercase tracking-wider transition-all
              border
              ${activeTab === 'legacy' 
                ? 'text-intent-secondary border-intent-secondary/50 bg-intent-secondary/10' 
                : 'text-text-ghost border-intent-neutral/20 hover:border-intent-secondary/30'
              }
            `}
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            }}
          >
            💬 Response Card
          </button>
        </div>

        {/* Content based on tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'dynamic' ? (
            <motion.div
              key="dynamic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DynamicUIDemo />
            </motion.div>
          ) : (
            <motion.div
              key="legacy"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <LegacyDemoContent />
            </motion.div>
          )}
        </AnimatePresence>
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
