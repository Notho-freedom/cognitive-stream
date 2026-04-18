import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { useWallpaper, type WallpaperPreset } from '@/hooks/useWallpaper';
import { cn } from '@/lib/utils';

type Section = 'apparence' | 'comportement' | 'audio' | 'systeme' | 'cognitif' | 'about';

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'apparence', label: 'Apparence', icon: '◉' },
  { id: 'comportement', label: 'Comportement', icon: '◇' },
  { id: 'audio', label: 'Audio', icon: '◈' },
  { id: 'systeme', label: 'Système', icon: '◆' },
  { id: 'cognitif', label: 'Cognitif', icon: '⊛' },
  { id: 'about', label: 'À propos', icon: '○' },
];

const PRESETS: Array<{ id: WallpaperPreset; label: string; preview: string }> = [
  { id: 'cyan-void', label: 'Cyan Void', preview: 'linear-gradient(135deg, hsl(187 85% 30%), hsl(220 30% 8%))' },
  { id: 'purple-haze', label: 'Purple Haze', preview: 'linear-gradient(135deg, hsl(280 75% 40%), hsl(260 30% 8%))' },
  { id: 'green-matrix', label: 'Green Matrix', preview: 'linear-gradient(135deg, hsl(155 80% 30%), hsl(150 30% 8%))' },
  { id: 'monochrome', label: 'Monochrome', preview: 'linear-gradient(135deg, hsl(220 12% 22%), hsl(220 10% 6%))' },
];

export default function Settings() {
  const [section, setSection] = useState<Section>('apparence');
  const wallpaper = useWallpaper();
  const [customUrl, setCustomUrl] = useState(wallpaper.state.customUrl ?? '');

  return (
    <div
      className="min-h-screen text-text-primary"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, hsl(187 85% 53% / 0.08), transparent),
          hsl(220 20% 4%)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-text-primary">
              Paramètres
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-text-ghost/60 mt-1">
              Cognitive Stream OS · v1.0
            </p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10 transition-colors"
            style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
          >
            ← Bureau
          </Link>
        </div>

        <div className="grid grid-cols-[200px_1fr] gap-4 min-h-[70vh]">
          {/* Sidebar */}
          <FuturisticFrame variant="primary" surfaceOpacity={0.9} gridOpacity={0.02}>
            <div className="p-2 space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors',
                    section === s.id
                      ? 'text-intent-primary bg-intent-primary/10 border-l-2 border-intent-primary'
                      : 'text-text-ghost/70 hover:text-text-primary hover:bg-white/5 border-l-2 border-transparent',
                  )}
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </FuturisticFrame>

          {/* Content */}
          <FuturisticFrame variant="primary" surfaceOpacity={0.95} gridOpacity={0.025}>
            <ScrollArea className="h-[70vh]">
              <motion.div
                key={section}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="p-6 space-y-6"
              >
                {section === 'apparence' && (
                  <>
                    <Heading title="Fond d'écran" subtitle="Choisissez un préréglage GX ou une image personnalisée" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PRESETS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => wallpaper.setPreset(p.id)}
                          className={cn(
                            'relative h-24 border-2 transition-all overflow-hidden',
                            wallpaper.state.preset === p.id
                              ? 'border-intent-primary ring-2 ring-intent-primary/30'
                              : 'border-intent-primary/15 hover:border-intent-primary/40',
                          )}
                          style={{ background: p.preview, clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)' }}
                        >
                          <div className="absolute bottom-1 left-2 text-[9px] uppercase tracking-wider text-white/90 font-light">
                            {p.label}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>URL personnalisée</Label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://exemple.com/image.jpg"
                          className="flex-1 px-3 py-2 text-xs bg-surface-deep/50 border border-intent-primary/20 text-text-primary outline-none focus:border-intent-primary/60"
                        />
                        <button
                          onClick={() => customUrl && wallpaper.setCustomUrl(customUrl)}
                          className="px-4 py-2 text-[10px] uppercase tracking-wider text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10"
                          style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {section === 'comportement' && (
                  <>
                    <Heading title="Interactions" subtitle="Réglages des contrôles & gestes" />
                    <Info text="Ctrl+Molette : redimensionne les icônes du bureau (toujours actif)." />
                    <Info text="Glissez pour créer un rectangle de sélection multiple." />
                    <Info text="Clic droit sur le bureau / les icônes pour les menus contextuels GX." />
                    <Info text="Ctrl+K : afficher / masquer le terminal IA. Échap : fermer." />
                  </>
                )}

                {section === 'audio' && (
                  <>
                    <Heading title="Audio" subtitle="Gérez les retours sonores et la voix" />
                    <Info text="Les paramètres audio sont accessibles depuis le panneau d'activité." />
                  </>
                )}

                {section === 'systeme' && (
                  <>
                    <Heading title="Système" subtitle="Intégration OS & comportement" />
                    <Info text="Mode plein écran : activé automatiquement au lancement Electron." />
                    <Info text="Remplacement explorateur Windows : configurable depuis le panneau d'activité." />
                    <Info text="Win+E : ouvre l'explorateur cognitif (mode Electron)." />
                  </>
                )}

                {section === 'cognitif' && (
                  <>
                    <Heading title="Cognitif" subtitle="Comportement de l'IA" />
                    <Info text="Mode autonome : auto-run par défaut. Modifiable dans le panneau d'activité." />
                    <Info text="Chaîne de fallback : Groq → OpenRouter → DeepSeek → Poe → Lovable → Ollama." />
                  </>
                )}

                {section === 'about' && (
                  <>
                    <Heading title="À propos" subtitle="Cognitive Stream OS" />
                    <div className="text-xs text-text-ghost/80 space-y-2 leading-relaxed">
                      <p>HUD cognitif futuriste, bureau immersif, agents spécialisés.</p>
                      <p>Architecture : React 18 · Vite · Electron · Tailwind · Framer Motion.</p>
                      <p>IA : Lovable AI Gateway · Ollama local (fallback offline).</p>
                    </div>
                  </>
                )}
              </motion.div>
            </ScrollArea>
          </FuturisticFrame>
        </div>
      </div>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-sm font-light tracking-[0.18em] uppercase text-intent-primary">{title}</h2>
      {subtitle && <p className="text-[10px] tracking-wider text-text-ghost/60 mt-1">{subtitle}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-text-ghost">{children}</div>;
}

function Info({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-text-ghost/80 border-l border-intent-primary/30 pl-3 py-1">
      <span className="text-intent-primary mt-px">▸</span>
      <span>{text}</span>
    </div>
  );
}
