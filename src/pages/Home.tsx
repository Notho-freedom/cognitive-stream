import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { NotificationProvider } from '@/components/cognitive';

const features = [
  {
    title: 'Zero JSX',
    description: 'Construisez des interfaces entières sans écrire une ligne de JSX',
    icon: '🚀',
    color: 'intent-primary'
  },
  {
    title: 'AI-Powered',
    description: 'Conçu pour être généré par des LLMs comme Claude',
    icon: '🤖',
    color: 'intent-secondary'
  },
  {
    title: '11+ Composants',
    description: 'Système complet de composants réutilisables',
    icon: '🧩',
    color: 'intent-focus'
  },
  {
    title: 'Type-Safe',
    description: 'TypeScript de bout en bout pour une DX optimale',
    icon: '🛡️',
    color: 'intent-success'
  },
];

const demos = [
  {
    path: '/dynamic',
    title: 'Static Examples',
    description: 'Showcase de tous les composants avec configs pré-définies',
    icon: '🎨',
    color: 'cyan'
  },
  {
    path: '/ai-generator',
    title: 'AI Generator',
    description: 'Interface conversationnelle pour générer des UIs',
    icon: '🤖',
    color: 'purple'
  },
];

export default function Home() {
  return (
    <NotificationProvider>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Ambient Background */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-intent-primary/5 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-intent-secondary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 pt-20 pb-16 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              className="inline-flex items-center gap-2 px-4 py-2 glass-surface rounded-full border border-intent-primary/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-intent-success animate-pulse" />
              <span className="text-xs text-text-ghost uppercase tracking-wider">System Active</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-extralight text-text-primary mb-4 tracking-tight">
              Cognitive <span className="text-intent-primary font-light">HUD</span>
            </h1>
            
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8 font-light">
              Un système révolutionnaire de composants auto-assemblables
              <br />
              <span className="text-intent-primary">basés sur JSON</span>
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                to="/dynamic"
                className="group relative px-8 py-4 overflow-hidden"
              >
                <span className="relative z-10 text-text-primary font-medium uppercase tracking-wider text-sm">
                  Explorer les Démos →
                </span>
                <div className="absolute inset-0 bg-intent-primary/20 border border-intent-primary/40 transition-all group-hover:bg-intent-primary/30"
                  style={{
                    clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)'
                  }}
                />
              </Link>

              <Link
                to="/ai-generator"
                className="group relative px-8 py-4 overflow-hidden"
              >
                <span className="relative z-10 text-text-secondary hover:text-text-primary font-medium uppercase tracking-wider text-sm transition-colors">
                  AI Generator →
                </span>
                <div className="absolute inset-0 border border-intent-neutral/20 group-hover:border-intent-primary/40 transition-colors"
                  style={{
                    clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)'
                  }}
                />
              </Link>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative z-10 max-w-6xl mx-auto px-8 pb-20"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="glass-surface p-6 rounded-cognitive border border-intent-neutral/20 hover:border-intent-primary/40 transition-all group"
                >
                  <div className={`text-4xl mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-text-primary font-medium mb-2 tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Architecture Diagram */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="relative z-10 max-w-5xl mx-auto px-8 pb-20"
          >
            <h2 className="text-3xl font-light text-text-primary text-center mb-12">
              Comment ça <span className="text-intent-primary">fonctionne</span>
            </h2>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {[
                { label: 'User Query', sublabel: 'Natural language', icon: '💬' },
                { label: 'AI Processing', sublabel: 'Claude / GPT-4', icon: '🧠' },
                { label: 'JSON Config', sublabel: 'Type-safe schema', icon: '📋' },
                { label: 'Dynamic Render', sublabel: 'Auto-assembly', icon: '⚙️' },
                { label: 'Beautiful UI', sublabel: 'Ready to use', icon: '✨' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.2 + i * 0.15, type: 'spring' }}
                    className="glass-surface p-6 rounded-cognitive text-center min-w-[140px]"
                  >
                    <div className="text-4xl mb-2">{step.icon}</div>
                    <div className="text-sm font-medium text-text-primary mb-1">
                      {step.label}
                    </div>
                    <div className="text-xs text-text-ghost">
                      {step.sublabel}
                    </div>
                  </motion.div>
                  
                  {i < 4 && (
                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 1.3 + i * 0.15, duration: 0.5 }}
                      className="hidden md:block w-12 h-px bg-gradient-to-r from-intent-primary/60 to-intent-primary/20"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Demos Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="relative z-10 max-w-5xl mx-auto px-8 pb-32"
          >
            <h2 className="text-3xl font-light text-text-primary text-center mb-12">
              Essayez les <span className="text-intent-primary">démos</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {demos.map((demo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 + i * 0.1 }}
                >
                  <Link
                    to={demo.path}
                    className="group block glass-surface-active p-8 rounded-cognitive border border-intent-primary/20 hover:border-intent-primary/60 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="text-5xl group-hover:scale-110 transition-transform">
                        {demo.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-medium text-text-primary mb-2 group-hover:text-intent-primary transition-colors">
                          {demo.title}
                        </h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          {demo.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-intent-primary uppercase tracking-wider font-medium">
                      <span>Explorer</span>
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Code Example */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="relative z-10 max-w-4xl mx-auto px-8 pb-32"
          >
            <h2 className="text-3xl font-light text-text-primary text-center mb-8">
              Simple et <span className="text-intent-primary">puissant</span>
            </h2>

            <div className="glass-surface p-8 rounded-cognitive border border-intent-primary/20">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-intent-neutral/20">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
                <span className="ml-4 text-xs text-text-ghost font-mono">example.tsx</span>
              </div>

              <pre className="text-sm text-text-secondary font-mono overflow-x-auto">
{`const config = {
  type: 'card',
  title: 'Dashboard',
  content: {
    type: 'stats',
    columns: 3,
    metrics: [
      { label: 'Users', value: '1.2M', trend: 'up' },
      { label: 'Revenue', value: '$45K', trend: 'up' },
      { label: 'Traffic', value: '324K', trend: 'down' }
    ]
  }
};

<DynamicRenderer config={config} />`}
              </pre>

              <div className="mt-6 pt-4 border-t border-intent-neutral/20">
                <p className="text-xs text-text-ghost">
                  ✨ C'est tout ! Aucun JSX additionnel nécessaire.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="relative z-10 text-center pb-16 px-8"
          >
            <p className="text-text-ghost text-sm mb-2">
              Made with 🧠 and ⚡ by a Fullstack Developer
            </p>
            <p className="text-text-ghost/60 text-xs">
              Inspired by Anthropic's work • Built with React + TypeScript + Framer Motion
            </p>
          </motion.div>
        </div>
      </div>
    </NotificationProvider>
  );
}
