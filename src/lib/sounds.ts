// Instant audio engine using Web Audio API.
// - 0ms latency (decoded AudioBuffers, no <audio> element buffering).
// - Each new play() instantly stops the previous instance of the SAME sound,
//   AND any currently-playing non-hover sound, so rapid UI events feel realtime.
// - hover is throttled (220ms) and isolated so it never interrupts a click.

export type SoundName =
  | 'hover' | 'click' | 'dblclick'
  | 'open' | 'close' | 'delete'
  | 'loading' | 'success' | 'error'
  | 'tab-new' | 'tab-close' | 'paste' | 'cut';

const SOUND_MAP: Record<SoundName, { src: string; vol: number }> = {
  hover:      { src: '/sounds/hover.wav',     vol: 0.18 },
  click:      { src: '/sounds/click.wav',     vol: 0.45 },
  dblclick:   { src: '/sounds/dblclick.wav',  vol: 0.55 },
  open:       { src: '/sounds/open.wav',      vol: 0.40 },
  close:      { src: '/sounds/close.wav',     vol: 0.45 },
  delete:     { src: '/sounds/delete.wav',    vol: 0.55 },
  loading:    { src: '/sounds/loading.wav',   vol: 0.35 },
  success:    { src: '/sounds/success.wav',   vol: 0.50 },
  error:      { src: '/sounds/error.wav',     vol: 0.45 },
  'tab-new':  { src: '/sounds/open.wav',      vol: 0.30 },
  'tab-close':{ src: '/sounds/tab-close.wav', vol: 0.45 },
  paste:      { src: '/sounds/click.wav',     vol: 0.45 },
  cut:        { src: '/sounds/click.wav',     vol: 0.40 },
};

const STORE_KEY_MUTED = 'explorer.sound.muted';
const STORE_KEY_VOL = 'explorer.sound.volume';

function readMuted(): boolean {
  try { return localStorage.getItem(STORE_KEY_MUTED) === '1'; } catch { return false; }
}
function readVol(): number {
  try { const v = parseFloat(localStorage.getItem(STORE_KEY_VOL) || '0.7'); return isNaN(v) ? 0.7 : v; }
  catch { return 0.7; }
}

let muted = readMuted();
let masterVolume = readVol();

const subs = new Set<() => void>();
export function subscribe(fn: () => void) { subs.add(fn); return () => subs.delete(fn); }
function notify() { subs.forEach(f => f()); }

export function isMuted() { return muted; }
export function getVolume() { return masterVolume; }
export function setMuted(b: boolean) {
  muted = b;
  try { localStorage.setItem(STORE_KEY_MUTED, b ? '1' : '0'); } catch {}
  notify();
}
export function setVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(STORE_KEY_VOL, String(masterVolume)); } catch {}
  notify();
}

// ── Web Audio engine ──
let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const loading = new Map<SoundName, Promise<AudioBuffer | null>>();

// Track the currently-active source per name + the last "interactive" source globally
// so a new event instantly cuts whatever was playing.
const activeByName = new Map<SoundName, AudioBufferSourceNode>();
let lastInteractive: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
    return ctx;
  } catch { return null; }
}

async function loadBuffer(name: SoundName): Promise<AudioBuffer | null> {
  if (buffers.has(name)) return buffers.get(name)!;
  if (loading.has(name)) return loading.get(name)!;
  const c = getCtx();
  if (!c) return null;
  const cfg = SOUND_MAP[name];
  const p = (async () => {
    try {
      const res = await fetch(cfg.src);
      const arr = await res.arrayBuffer();
      const buf = await c.decodeAudioData(arr);
      buffers.set(name, buf);
      return buf;
    } catch { return null; }
  })();
  loading.set(name, p);
  return p;
}

function stopSource(src: AudioBufferSourceNode | null) {
  if (!src) return;
  try { src.onended = null; src.stop(0); src.disconnect(); } catch {}
}

function playBuffer(name: SoundName, buf: AudioBuffer) {
  const c = getCtx();
  if (!c) return;
  // Resume context if suspended (autoplay policy)
  if (c.state === 'suspended') { void c.resume(); }

  // Instantly cut previous instance of same sound
  stopSource(activeByName.get(name) || null);
  // Hover never interrupts other sounds, but other sounds DO interrupt the last interactive
  if (name !== 'hover') {
    stopSource(lastInteractive);
    lastInteractive = null;
  }

  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = SOUND_MAP[name].vol * masterVolume;
  src.connect(gain).connect(c.destination);
  src.onended = () => {
    if (activeByName.get(name) === src) activeByName.delete(name);
    if (lastInteractive === src) lastInteractive = null;
    try { src.disconnect(); gain.disconnect(); } catch {}
  };
  activeByName.set(name, src);
  if (name !== 'hover') lastInteractive = src;
  try { src.start(0); } catch {}
}

// Pre-warm all sounds on first user gesture
let warmed = false;
function warmAll() {
  if (warmed) return;
  warmed = true;
  getCtx()?.resume?.().catch(() => {});
  (Object.keys(SOUND_MAP) as SoundName[]).forEach(n => { void loadBuffer(n); });
}
if (typeof window !== 'undefined') {
  const onFirst = () => { warmAll(); };
  window.addEventListener('pointerdown', onFirst, { once: true });
  window.addEventListener('keydown', onFirst, { once: true });
}

export function play(name: SoundName) {
  if (muted || masterVolume === 0) return;
  const buf = buffers.get(name);
  if (buf) { playBuffer(name, buf); return; }
  // Not yet decoded — kick off load and play once ready (best-effort)
  void loadBuffer(name).then(b => { if (b && !muted) playBuffer(name, b); });
}

let lastHover = 0;
export function playHover() {
  const t = performance.now();
  if (t - lastHover < 220) return;
  lastHover = t;
  play('hover');
}
