import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CognitiveSurface, 
  StateIndicator, 
  ThoughtStream,
  EphemeralAction,
  ResponseCard,
  IndicatorMode 
} from '@/components/cognitive';

const DEMO_TEXT = "Je suis une intelligence cognitive. Mon interface n'est pas un objet — c'est un état transitoire du système. Tout apparaît, aide, puis disparaît.";

const states: IndicatorMode[] = ['idle', 'listening', 'thinking', 'responding', 'success'];

export default function Index() {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [showResponse, setShowResponse] = useState(false);

  // Cycle through states for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStateIndex(i => (i + 1) % states.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-8 lg:p-16 overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-intent-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-intent-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-4">
            <StateIndicator mode="idle" size="sm" />
            <h1 className="text-2xl font-light tracking-wide text-text-primary">
              Cognitive HUD
            </h1>
          </div>
          <p className="text-text-muted font-thin tracking-wide max-w-xl">
            Design System — Accel World × Apple Vision Pro
          </p>
        </motion.header>

        {/* Components Showcase */}
        <div className="space-y-20">
          
          {/* Section 1: State Indicators */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h2 className="text-sm uppercase tracking-widest text-text-ghost mb-8 font-light">
              State Indicators
            </h2>
            
            <CognitiveSurface intent="neutral" className="p-8">
              <div className="flex flex-wrap items-center gap-12">
                {states.map((state, i) => (
                  <motion.div
                    key={state}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <StateIndicator mode={state} size="lg" />
                    <span className="text-xs text-text-ghost uppercase tracking-wider">
                      {state}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CognitiveSurface>
          </motion.section>

          {/* Section 2: Cognitive Surfaces */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-sm uppercase tracking-widest text-text-ghost mb-8 font-light">
              Cognitive Surfaces
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CognitiveSurface intent="primary" state="idle" className="p-6">
                <h3 className="text-text-primary font-light mb-2">Primary Intent</h3>
                <p className="text-text-secondary text-sm font-thin">
                  Cyan glacial — focus principal
                </p>
              </CognitiveSurface>

              <CognitiveSurface intent="secondary" state="idle" glow className="p-6">
                <h3 className="text-text-primary font-light mb-2">Secondary + Glow</h3>
                <p className="text-text-secondary text-sm font-thin">
                  Violet électrique — énergie
                </p>
              </CognitiveSurface>

              <CognitiveSurface intent="focus" state="listening" className="p-6">
                <h3 className="text-text-primary font-light mb-2">Focus State</h3>
                <p className="text-text-secondary text-sm font-thin">
                  Active — listening mode
                </p>
              </CognitiveSurface>
            </div>
          </motion.section>

          {/* Section 3: Thought Stream */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h2 className="text-sm uppercase tracking-widest text-text-ghost mb-8 font-light">
              Thought Stream
            </h2>
            
            <CognitiveSurface intent="primary" glow className="p-8 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <StateIndicator mode={states[currentStateIndex]} size="sm" showLabel />
              </div>
              <ThoughtStream 
                text={DEMO_TEXT}
                speed="adaptive"
                isStreaming={true}
              />
            </CognitiveSurface>
          </motion.section>

          {/* Section 4: Ephemeral Actions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <h2 className="text-sm uppercase tracking-widest text-text-ghost mb-8 font-light">
              Ephemeral Actions
            </h2>
            
            <div className="flex flex-wrap gap-4">
              <EphemeralAction 
                label="Confirmer" 
                variant="primary"
                ttl={10000}
                onConfirm={() => console.log('Confirmed')}
              />
              <EphemeralAction 
                label="Exécuter" 
                variant="secondary"
                ttl={10000}
              />
              <EphemeralAction 
                label="Annuler" 
                variant="subtle"
                ttl={10000}
              />
            </div>
          </motion.section>

          {/* Section 5: Response Card Demo */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            <h2 className="text-sm uppercase tracking-widest text-text-ghost mb-8 font-light">
              Response Card
            </h2>
            
            <button
              onClick={() => setShowResponse(true)}
              className="text-intent-primary text-sm font-light tracking-wide underline underline-offset-4 mb-8 hover:text-intent-primary-glow transition-colors"
            >
              Trigger Response →
            </button>

            <AnimatePresence>
              {showResponse && (
                <ResponseCard
                  text="Analyse terminée. J'ai identifié 3 patterns récurrents dans vos données. Voulez-vous que je génère un rapport détaillé ?"
                  state="responding"
                  showAction
                  actionLabel="Générer"
                  onAction={() => {
                    console.log('Action triggered');
                    setShowResponse(false);
                  }}
                  onDismiss={() => setShowResponse(false)}
                />
              )}
            </AnimatePresence>
          </motion.section>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="pt-16 border-t border-border/30"
          >
            <p className="text-text-ghost text-sm font-thin tracking-wide">
              L'interface n'est pas un objet — c'est un état transitoire du système.
            </p>
          </motion.footer>
        </div>
      </div>
    </div>
  );
}