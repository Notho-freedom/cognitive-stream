import { Link } from 'react-router-dom';
import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { useSettings, WALLPAPER_BACKGROUNDS, type DesktopSettings } from '@/hooks/useSettings';
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

type WallpaperPreset = DesktopSettings['wallpaperPreset'];

const PRESETS: Array<{ id: WallpaperPreset; label: string; preview: string }> = [
  { id: 'cyan-void', label: 'Cyan Void', preview: 'linear-gradient(135deg, hsl(187 85% 30%), hsl(220 30% 8%))' },
  { id: 'purple-haze', label: 'Purple Haze', preview: 'linear-gradient(135deg, hsl(280 75% 40%), hsl(260 30% 8%))' },
  { id: 'green-matrix', label: 'Green Matrix', preview: 'linear-gradient(135deg, hsl(155 80% 30%), hsl(150 30% 8%))' },
  { id: 'monochrome', label: 'Monochrome', preview: 'linear-gradient(135deg, hsl(220 12% 22%), hsl(220 10% 6%))' },
];

const FONTS: Array<{ id: DesktopSettings['fontFamily']; label: string; sample: string }> = [
  { id: 'default', label: 'Système', sample: 'Inter / System' },
  { id: 'mono', label: 'Monospace', sample: 'JetBrains Mono' },
  { id: 'sans', label: 'Sans-serif', sample: 'Helvetica Neue' },
];

const SLIDESHOW_INTERVALS = [1, 2, 5, 10, 15, 30];

export default function Settings() {
  const [section, setSection] = useState<Section>('apparence');
  const { settings, update, updateMany, reset } = useSettings();
  const [customUrl, setCustomUrl] = useState(settings.wallpaperCustomUrl ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const urls: string[] = [];
    let processed = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        urls.push(reader.result as string);
        processed++;
        if (processed === imageFiles.length) {
          if (urls.length === 1) {
            // Single image -> custom wallpaper
            update('wallpaperCustomUrl', urls[0]);
            update('wallpaperPreset', 'custom');
          } else {
            // Multiple images -> slideshow
            update('wallpaperSlideshow', [...(settings.wallpaperSlideshow ?? []), ...urls]);
            update('wallpaperPreset', 'slideshow');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [update, settings.wallpaperSlideshow]);

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
              Cognitive Stream OS · v3.0
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-intent-warning border border-intent-warning/40 hover:bg-intent-warning/10 transition-colors rounded-lg"
            >
              Réinitialiser
            </button>
            <Link
              to="/"
              className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10 transition-colors rounded-lg"
            >
              ← Bureau
            </Link>
          </div>
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
                    'w-full flex items-center gap-3 px-3 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors rounded-lg',
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
                    <Heading title="Fond d'écran" subtitle="Préréglages, image personnalisée ou diaporama" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PRESETS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => update('wallpaperPreset', p.id)}
                          className={cn(
                            'relative h-24 rounded-xl border-2 transition-all overflow-hidden',
                            settings.wallpaperPreset === p.id
                              ? 'border-intent-primary ring-2 ring-intent-primary/30'
                              : 'border-intent-primary/15 hover:border-intent-primary/40',
                          )}
                          style={{ background: p.preview }}
                        >
                          <div className="absolute bottom-1.5 left-2.5 text-[9px] uppercase tracking-wider text-white/90 font-light">
                            {p.label}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* File / Folder selection */}
                    <div className="space-y-3">
                      <Label>Image ou dossier</Label>
                      <div className="flex gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        <input ref={folderInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect}
                          {...({ webkitdirectory: '', directory: '' } as any)}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 px-4 py-2.5 text-[10px] uppercase tracking-wider text-intent-primary border border-intent-primary/30 hover:bg-intent-primary/10 transition-colors rounded-lg"
                        >
                          📄 Choisir une image
                        </button>
                        <button
                          onClick={() => folderInputRef.current?.click()}
                          className="flex-1 px-4 py-2.5 text-[10px] uppercase tracking-wider text-intent-primary border border-intent-primary/30 hover:bg-intent-primary/10 transition-colors rounded-lg"
                        >
                          📁 Choisir un dossier
                        </button>
                      </div>
                    </div>

                    {/* Custom URL */}
                    <div className="space-y-2">
                      <Label>URL personnalisée</Label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://exemple.com/image.jpg"
                          className="flex-1 px-3 py-2 text-xs bg-surface-deep/50 border border-intent-primary/20 text-text-primary outline-none focus:border-intent-primary/60 rounded-lg"
                        />
                        <button
                          onClick={() => { if (customUrl) { update('wallpaperCustomUrl', customUrl); update('wallpaperPreset', 'custom'); } }}
                          className="px-4 py-2 text-[10px] uppercase tracking-wider text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/10 rounded-lg"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>

                    {/* Slideshow settings */}
                    {settings.wallpaperPreset === 'slideshow' && (settings.wallpaperSlideshow?.length ?? 0) > 0 && (
                      <div className="space-y-3 p-3 border border-intent-primary/15 rounded-xl">
                        <div className="flex items-center justify-between">
                          <Label>Diaporama · {settings.wallpaperSlideshow.length} images</Label>
                          <button
                            onClick={() => { update('wallpaperSlideshow', []); update('wallpaperPreset', 'cyan-void'); }}
                            className="text-[9px] uppercase tracking-wider text-intent-warning hover:text-intent-warning/80"
                          >
                            Supprimer tout
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {settings.wallpaperSlideshow.slice(0, 8).map((url, i) => (
                            <div key={i} className="w-16 h-10 rounded-md overflow-hidden border border-intent-primary/20">
                              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {settings.wallpaperSlideshow.length > 8 && (
                            <span className="text-[9px] text-text-ghost/50">+{settings.wallpaperSlideshow.length - 8}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label>Intervalle</Label>
                          <div className="flex gap-1.5">
                            {SLIDESHOW_INTERVALS.map(min => (
                              <button
                                key={min}
                                onClick={() => update('wallpaperSlideshowInterval', min)}
                                className={cn(
                                  'px-2.5 py-1 text-[9px] uppercase tracking-wider border rounded-md transition-colors',
                                  settings.wallpaperSlideshowInterval === min
                                    ? 'border-intent-primary bg-intent-primary/15 text-intent-primary'
                                    : 'border-intent-primary/15 text-text-ghost/60 hover:border-intent-primary/40',
                                )}
                              >
                                {min}min
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Heading title="Transparence" subtitle="Opacité des surfaces" />
                    <div className="px-1 space-y-2">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                        <span>Opacité</span>
                        <span>{Math.round(settings.surfaceOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[Math.round(settings.surfaceOpacity * 100)]}
                        min={50} max={95} step={1}
                        onValueChange={(v) => update('surfaceOpacity', v[0] / 100)}
                      />
                    </div>

                    <Heading title="Police" subtitle="Famille typographique" />
                    <div className="grid grid-cols-3 gap-2">
                      {FONTS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => update('fontFamily', f.id)}
                          className={cn(
                            'px-3 py-3 text-center border transition-all rounded-lg',
                            settings.fontFamily === f.id
                              ? 'border-intent-primary bg-intent-primary/10 text-intent-primary'
                              : 'border-intent-primary/15 text-text-ghost hover:border-intent-primary/40',
                          )}
                        >
                          <div className="text-[10px] uppercase tracking-wider">{f.label}</div>
                          <div className="text-[9px] text-text-ghost/60 mt-1">{f.sample}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {section === 'comportement' && (
                  <>
                    <Heading title="Interactions" subtitle="Réglages des contrôles & gestes" />
                    <ToggleRow label="Animations" checked={settings.animationsEnabled} onChange={v => update('animationsEnabled', v)} />
                    <ToggleRow label="Mode réduit (performances)" checked={settings.reduceMotion} onChange={v => update('reduceMotion', v)} />
                    <ToggleRow label="Grille d'accrochage des icônes" checked={settings.snapGrid} onChange={v => update('snapGrid', v)} />

                    <Heading title="Taille des icônes" subtitle="Ctrl+Molette pour ajuster en direct" />
                    <div className="px-1 space-y-2">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-text-ghost">
                        <span>Échelle</span>
                        <span>{Math.round(settings.iconScale * 100)}%</span>
                      </div>
                      <Slider
                        value={[Math.round(settings.iconScale * 100)]}
                        min={60} max={180} step={10}
                        onValueChange={(v) => update('iconScale', v[0] / 100)}
                      />
                    </div>
                  </>
                )}

                {section === 'audio' && (
                  <>
                    <Heading title="Audio" subtitle="Retours sonores et voix" />
                    <ToggleRow label="Sons d'interface" checked={settings.soundsEnabled} onChange={v => update('soundsEnabled', v)} />
                    <ToggleRow label="Synthèse vocale (TTS)" checked={settings.ttsEnabled} onChange={v => update('ttsEnabled', v)} />
                    <ToggleRow label="Entrée vocale" checked={settings.voiceInputEnabled} onChange={v => update('voiceInputEnabled', v)} />
                  </>
                )}

                {section === 'systeme' && (
                  <>
                    <Heading title="Système" subtitle="Intégration OS & comportement" />
                    <ToggleRow label="Plein écran automatique" checked={settings.autoFullscreen} onChange={v => update('autoFullscreen', v)} />
                    <ToggleRow label="Remplacement de l'explorateur Windows" checked={settings.explorerTakeoverEnabled} onChange={v => update('explorerTakeoverEnabled', v)} />
                    <Info text="Mode plein écran : activé automatiquement au lancement Electron." />
                    <Info text="L'explorateur de fichiers est en cours de développement." />
                  </>
                )}

                {section === 'cognitif' && (
                  <>
                    <Heading title="Intelligence artificielle" subtitle="Comportement et niveau d'autonomie" />
                    <div className="space-y-2">
                      <Label>Niveau d'autonomie</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['manual', 'assisted', 'autonomous'] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => update('autonomyLevel', level)}
                            className={cn(
                              'px-3 py-2 text-[10px] uppercase tracking-wider border transition-all rounded-lg',
                              settings.autonomyLevel === level
                                ? 'border-intent-primary bg-intent-primary/10 text-intent-primary'
                                : 'border-intent-primary/15 text-text-ghost hover:border-intent-primary/40',
                            )}
                          >
                            {level === 'manual' ? 'Manuel' : level === 'assisted' ? 'Assisté' : 'Autonome'}
                          </button>
                        ))}
                      </div>
                    </div>
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
                      <p className="text-[10px] text-text-ghost/40 mt-4">v3.0 · Settings Store v{settings.version}</p>
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

function ToggleRow({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-text-ghost/80">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
