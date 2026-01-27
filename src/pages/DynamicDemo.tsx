import { useState } from 'react';
import { motion } from 'framer-motion';
import { DynamicRenderer } from '@/components/cognitive/DynamicRenderer';
import { AI_EXAMPLES } from '@/components/cognitive/examples.config';
import { NotificationProvider, useNotifications } from '@/components/cognitive';

const examples = [
  { id: 'africanCountries', label: 'Liste des pays', icon: '🌍' },
  { id: 'quiz', label: 'Interface Quiz', icon: '❓' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'timeline', label: 'Timeline', icon: '⏱️' },
  { id: 'searchForm', label: 'Formulaire', icon: '🔍' },
  { id: 'productComparison', label: 'Comparaison', icon: '⚖️' },
];

function DemoControls({ onSelect }: { onSelect: (id: string) => void }) {
  const { push } = useNotifications();

  return (
    <div className="flex flex-wrap gap-3 justify-center mb-8">
      {examples.map((example) => (
        <motion.button
          key={example.id}
          onClick={() => {
            onSelect(example.id);
            push({
              message: `Configuration ${example.label} chargée`,
              priority: 'low',
            });
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 glass-surface rounded-lg border border-intent-primary/20 hover:border-intent-primary/40 transition-colors"
        >
          <span className="text-xl mr-2">{example.icon}</span>
          <span className="text-xs text-text-secondary">{example.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function JsonViewer({ config }: { config: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface p-4 rounded-lg border border-intent-secondary/20 mt-6"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-intent-secondary uppercase tracking-wider">
          Configuration JSON
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-text-ghost hover:text-text-secondary transition-colors"
        >
          {isExpanded ? 'Réduire' : 'Développer'}
        </button>
      </div>
      
      <motion.pre
        initial={false}
        animate={{ height: isExpanded ? 'auto' : '120px' }}
        className="text-xs text-intent-secondary font-mono overflow-auto bg-surface-deep/50 p-3 rounded"
      >
        {JSON.stringify(config, null, 2)}
      </motion.pre>
    </motion.div>
  );
}

function DynamicDemo() {
  const [selectedExample, setSelectedExample] = useState('africanCountries');
  const config = AI_EXAMPLES[selectedExample as keyof typeof AI_EXAMPLES];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-light text-text-primary mb-2 tracking-wide">
          🧠 Cognitive Dynamic Renderer
        </h1>
        <p className="text-sm text-text-ghost">
          Système de composants auto-assemblables via configuration JSON
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-text-ghost">
          <span className="w-2 h-2 rounded-full bg-intent-success animate-pulse" />
          <span>Système actif • {examples.length} exemples chargés</span>
        </div>
      </motion.div>

      {/* Controls */}
      <DemoControls onSelect={setSelectedExample} />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto">
        <motion.div
          key={selectedExample}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-surface-active p-8 rounded-cognitive glow-primary"
        >
          {/* Rendered UI */}
          <DynamicRenderer config={config} />
        </motion.div>

        {/* JSON Config Viewer */}
        <JsonViewer config={config} />

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 glass-surface rounded-lg border-l-4 border-intent-primary"
        >
          <h3 className="text-sm font-medium text-intent-primary mb-2 uppercase tracking-wider">
            💡 Comment ça fonctionne ?
          </h3>
          <ul className="space-y-2 text-xs text-text-secondary">
            <li className="flex gap-2">
              <span className="text-intent-primary">→</span>
              <span>L'IA génère une <strong>configuration JSON</strong> décrivant l'UI</span>
            </li>
            <li className="flex gap-2">
              <span className="text-intent-primary">→</span>
              <span>Le <strong>DynamicRenderer</strong> parse le JSON et assemble les composants</span>
            </li>
            <li className="flex gap-2">
              <span className="text-intent-primary">→</span>
              <span>Les composants sont <strong>réutilisables</strong> et <strong>composables</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-intent-primary">→</span>
              <span>Zero code HTML/JSX à écrire - tout est <strong>data-driven</strong></span>
            </li>
          </ul>

          <div className="mt-4 p-3 bg-surface-deep/50 rounded border border-intent-primary/20">
            <p className="text-xs text-text-ghost font-mono">
              <span className="text-intent-secondary">// Exemple d'utilisation:</span><br />
              <span className="text-intent-primary">const</span> config = generateAIConfig(<span className="text-yellow-400">"Liste les pays d'Afrique"</span>);<br />
              <span className="text-intent-primary">&lt;DynamicRenderer</span> config=&#123;config&#125; <span className="text-intent-primary">/&gt;</span>
            </p>
          </div>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 p-6 glass-surface rounded-lg"
        >
          <h3 className="text-sm font-medium text-text-primary mb-4 uppercase tracking-wider">
            🏗️ Architecture
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            {[
              { label: 'User Query', icon: '💬', color: 'text-blue-400' },
              { label: 'AI Processing', icon: '🤖', color: 'text-purple-400' },
              { label: 'JSON Config', icon: '📋', color: 'text-yellow-400' },
              { label: 'Dynamic Renderer', icon: '⚙️', color: 'text-green-400' },
              { label: 'UI Output', icon: '✨', color: 'text-cyan-400' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="glass-surface p-3 rounded-lg"
                >
                  <span className={`text-2xl ${step.color}`}>{step.icon}</span>
                </motion.div>
                {i < 4 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="hidden md:block w-8 h-px bg-intent-primary/40"
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted text-center mt-4">
            Flux unidirectionnel: Query → Processing → Config → Render → UI
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function DynamicDemoPage() {
  return (
    <NotificationProvider>
      <DynamicDemo />
    </NotificationProvider>
  );
}
