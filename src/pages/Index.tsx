import { motion } from 'framer-motion';
import { 
  NotificationProvider, 
  NotificationQueue, 
  CommandInput,
  CognitiveInterface,
} from '@/components/cognitive';

export default function Index() {
  return (
    <NotificationProvider>
      <div className="min-h-screen flex items-center justify-center p-8 overflow-hidden">
        {/* Minimal ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
        </div>

        {/* Notification Queue */}
        <NotificationQueue position="top-right" />
        
        {/* Command Input (Cmd/Ctrl + K) */}
        <CommandInput 
          onSubmit={(query) => console.log('Search:', query)}
          onSelect={(s) => console.log('Selected:', s.label)}
        />

        <div className="relative z-10 w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-sm uppercase tracking-[0.3em] text-text-ghost font-light mb-2">
              Cognitive UI System
            </h1>
            <p className="text-xs text-text-ghost/60 font-mono">
              DYNAMIC.SCHEMA.RENDERER + GROQ.AI
            </p>
          </motion.div>

          {/* Main Interface */}
          <CognitiveInterface />
        </div>
      </div>
    </NotificationProvider>
  );
}
