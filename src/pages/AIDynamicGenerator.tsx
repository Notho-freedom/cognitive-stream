import { useState } from 'react';
import { motion } from 'framer-motion';
import { DynamicRenderer, ComponentConfig } from '@/components/cognitive';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ThoughtStream } from '@/components/cognitive/ThoughtStream';

/**
 * 🤖 AI-Powered Dynamic UI Generator
 * 
 * Ce composant démontre comment intégrer Claude API pour générer
 * des interfaces dynamiques basées sur des requêtes en langage naturel.
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  config?: ComponentConfig | ComponentConfig[];
}

export function AIDynamicGenerator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Génère une UI via Claude API
   * 
   * En production, vous appelleriez l'API Claude ici:
   * const response = await fetch('https://api.anthropic.com/v1/messages', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     model: 'claude-sonnet-4-20250514',
   *     max_tokens: 1000,
   *     messages: [{ role: 'user', content: prompt }]
   *   })
   * });
   */
  const generateUI = async (userQuery: string) => {
    setIsGenerating(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);

    // Simulate API call (en production, remplacer par un vrai call)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Le prompt système pour Claude
    const systemPrompt = `
Tu es un générateur d'interfaces utilisateur cognitive. 
Tu dois TOUJOURS répondre avec un JSON valide qui correspond au schéma ComponentConfig.

Types disponibles: text, list, grid, card, input, button, progress, stats, timeline, chart, layout

Exemple de réponse pour "Liste les continents":
{
  "type": "list",
  "variant": "detailed",
  "selectable": true,
  "items": [
    {"id": "africa", "label": "Afrique", "description": "30.3M km²", "icon": "🌍"},
    {"id": "asia", "label": "Asie", "description": "44.5M km²", "icon": "🌏"}
  ]
}

Requête utilisateur: ${userQuery}

Réponds UNIQUEMENT avec le JSON de configuration, rien d'autre.
    `.trim();

    // En production: const aiResponse = await callClaudeAPI(systemPrompt);
    // Pour la démo, on simule des réponses
    const mockResponse = getMockResponse(userQuery);

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Interface générée pour: "${userQuery}"`,
        config: mockResponse
      }
    ]);

    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      generateUI(input.trim());
      setInput('');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-text-primary mb-2">
            🤖 AI Dynamic UI Generator
          </h1>
          <p className="text-sm text-text-ghost">
            Décrivez l'interface que vous voulez, Claude la génère
          </p>
        </div>

        {/* Input Form */}
        <FuturisticFrame variant="primary" className="mb-8">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: Crée un dashboard avec 3 métriques..."
                disabled={isGenerating}
                className="flex-1 bg-surface-glass/10 border border-intent-primary/20 rounded px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost focus:border-intent-primary/40 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isGenerating || !input.trim()}
                className="px-6 py-3 bg-intent-primary/20 text-intent-primary border border-intent-primary/40 rounded hover:bg-intent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                {isGenerating ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </form>
        </FuturisticFrame>

        {/* Messages */}
        <div className="space-y-6">
          {messages.map((message, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-lg bg-intent-primary/10 border border-intent-primary/20 rounded-lg p-4">
                    <p className="text-sm text-text-secondary">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ThoughtStream
                    text={message.content}
                    speed="normal"
                    isStreaming={false}
                  />
                  {message.config && (
                    <FuturisticFrame variant="secondary">
                      <div className="p-6">
                        <DynamicRenderer config={message.config} />
                      </div>
                    </FuturisticFrame>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Loading state */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-text-ghost mt-6"
          >
            <div className="w-2 h-2 rounded-full bg-intent-primary animate-pulse" />
            <span className="text-sm">Claude génère votre interface...</span>
          </motion.div>
        )}

        {/* Quick Examples */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 glass-surface p-6 rounded-lg"
          >
            <h3 className="text-sm text-text-muted uppercase tracking-wider mb-4">
              💡 Essayez ces exemples
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Liste les planètes du système solaire',
                'Crée un dashboard avec 4 métriques',
                'Timeline de l\'histoire de l\'informatique',
                'Formulaire de contact avec validation',
                'Graphique des ventes mensuelles',
                'Comparaison de 3 produits',
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
                  className="text-left p-3 glass-surface rounded border border-intent-neutral/20 hover:border-intent-primary/40 transition-colors text-xs text-text-secondary"
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 p-6 glass-surface rounded-lg border-l-4 border-intent-secondary"
        >
          <h3 className="text-sm font-medium text-intent-secondary mb-2 uppercase tracking-wider">
            🔧 Comment ça fonctionne
          </h3>
          <div className="space-y-2 text-xs text-text-secondary">
            <p>
              <strong>1. Requête:</strong> Vous décrivez l'interface en langage naturel
            </p>
            <p>
              <strong>2. AI Processing:</strong> Claude analyse et génère une configuration JSON
            </p>
            <p>
              <strong>3. Dynamic Render:</strong> Le système assemble automatiquement les composants
            </p>
            <p>
              <strong>4. Interactive UI:</strong> Vous obtenez une interface fonctionnelle et stylée
            </p>
          </div>

          <div className="mt-4 p-3 bg-surface-deep/50 rounded border border-intent-secondary/20">
            <p className="text-xs text-text-ghost font-mono">
              <span className="text-intent-secondary">// En production:</span><br />
              <span className="text-intent-primary">const</span> response = <span className="text-intent-primary">await</span> fetch(<span className="text-yellow-400">'https://api.anthropic.com/v1/messages'</span>);<br />
              <span className="text-intent-primary">const</span> config = JSON.parse(response.content);<br />
              <span className="text-intent-primary">&lt;DynamicRenderer</span> config=&#123;config&#125; <span className="text-intent-primary">/&gt;</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Mock responses pour la démo
 * En production, ces réponses viendraient de Claude API
 */
function getMockResponse(query: string): ComponentConfig | ComponentConfig[] {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('planète') || lowerQuery.includes('système solaire')) {
    return {
      type: 'card',
      title: 'Planètes du Système Solaire',
      content: {
        type: 'list',
        variant: 'detailed',
        items: [
          { id: 'mercury', label: 'Mercure', description: '57.9M km du Soleil', icon: '☿️' },
          { id: 'venus', label: 'Vénus', description: '108.2M km du Soleil', icon: '♀️' },
          { id: 'earth', label: 'Terre', description: '149.6M km du Soleil', icon: '🌍' },
          { id: 'mars', label: 'Mars', description: '227.9M km du Soleil', icon: '♂️' },
        ]
      }
    };
  }

  if (lowerQuery.includes('dashboard') || lowerQuery.includes('métrique')) {
    return {
      type: 'grid',
      columns: 2,
      gap: 20,
      children: [
        {
          type: 'card',
          title: 'Utilisateurs',
          content: { type: 'stats', columns: 1, metrics: [{ label: 'Total', value: '1.2M', trend: 'up', change: 12 }] }
        },
        {
          type: 'card',
          title: 'Revenus',
          content: { type: 'stats', columns: 1, metrics: [{ label: 'MRR', value: '$45K', trend: 'up', change: 8.5 }] }
        },
        {
          type: 'card',
          title: 'Trafic',
          content: { type: 'stats', columns: 1, metrics: [{ label: 'Visiteurs', value: '324K', trend: 'down', change: -3.2 }] }
        },
        {
          type: 'card',
          title: 'Conversions',
          content: { type: 'stats', columns: 1, metrics: [{ label: 'Taux', value: '2.4%', trend: 'up', change: 0.8 }] }
        },
      ]
    };
  }

  if (lowerQuery.includes('timeline') || lowerQuery.includes('histoire')) {
    return {
      type: 'timeline',
      events: [
        { id: '1', timestamp: '1936', title: 'Machine de Turing', status: 'completed' },
        { id: '2', timestamp: '1945', title: 'ENIAC', status: 'completed' },
        { id: '3', timestamp: '1971', title: 'Premier microprocesseur', status: 'completed' },
        { id: '4', timestamp: '1991', title: 'World Wide Web', status: 'completed' },
      ]
    };
  }

  // Default fallback
  return {
    type: 'text',
    variant: 'body',
    content: `Interface générée pour: "${query}". Essayez une requête plus spécifique !`,
    color: 'muted'
  };
}

export default AIDynamicGenerator;
