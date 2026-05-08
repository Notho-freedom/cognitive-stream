# Plan — Desktop sur le web + Fix crash Electron

## Objectif
1. Permettre d'accéder au bureau immersif **depuis la vue web** (avec données fictives), pour pouvoir tout prévisualiser : taskbar, icônes, fenêtres, explorateur, terminal, context menus.
2. **Localiser et corriger** le crash où le contenu disparaît dès qu'on clique dans la fenêtre Electron (problème également présent dans le repo de l'explorateur d'origine).
3. Compléter ce qui manque (flows simulés) pour que tout soit testable en web.

---

## Partie A — Bureau accessible depuis le web

### A1. Nouvelle route `/desktop`
- Ajouter `<Route path="/desktop" element={<DesktopPage />} />` dans `src/App.tsx`.
- Créer `src/pages/Desktop.tsx` qui rend `<DesktopWidgetShell forceWeb />` (force le mode bureau même hors Electron).

### A2. Découpler `DesktopWidgetShell` d'Electron
- Ajouter un prop `forceWeb?: boolean` à `DesktopWidgetShell`.
- Dans `useSystemBridge`, conserver le comportement actuel (bridge inactif sur web) ; tous les hooks doivent tomber proprement sur des **mocks** quand `isAvailable === false`.
- Vérifier que `useDesktopIcons(true)` produit bien des icônes mock (si non, brancher sur `mockFileSystem`).
- Pour `RealExplorerTab` : déjà gardé par `bridge.isAvailable`, donc en web on tombe sur `ExplorerTab` (mock) — bon par défaut.

### A3. Lien d'accès depuis l'écran web par défaut
- Dans `src/pages/Index.tsx` (vue cognitive web), ajouter un petit bouton discret « Ouvrir le bureau » qui navigue vers `/desktop`.
- Conserver le `LoadingScreen` initial (skip si déjà visité — `sessionStorage`).

### A4. Mocks complets pour fluidité web
- S'assurer que toutes les actions clés fonctionnent avec mocks :
  - Double-clic icône → ouvre `FileExplorer` (mock data via `mockFileSystem`).
  - Terminal → `TerminalWindow` doit fonctionner sans bridge (mode echo/simulation).
  - Wallpaper, accent, icon scale, slideshow → déjà côté `useSettings` (localStorage), OK.
  - Context menu bureau, Alt+Tab, snap, system tray → déjà UI-only, OK.
- Ajouter un fallback simulation dans `TerminalWindow` quand `bridge.exec` indisponible (renvoie un texte mock après 200ms).

### A5. Adaptation viewport web
- `position: fixed inset-0` du shell est déjà compatible : il occupera le viewport du `/desktop`. Vérifier qu'on n'a pas de scrollbar parasite (overflow hidden sur `body` quand sur cette route, via une classe ajoutée par `Desktop.tsx`).

---

## Partie B — Crash Electron : « clic = écran noir »

### B1. Diagnostic (hypothèse principale)
Symptôme : juste après un clic, tout le React tree disparaît, on ne voit plus que `DesktopBackground`. C'est le pattern d'un **ErrorBoundary qui catch puis affiche un fallback transparent**, OU d'un **render conditionnel qui passe à `null`**.

Pistes à inspecter :
1. **`DesktopErrorBoundary`** : son fallback affiche normalement une carte « ERREUR SYSTÈME ». Si on voit juste le fond, soit le fallback est masqué par un z-index, soit l'erreur survient ailleurs.
2. **`RealExplorerTab` / `useRealFileExplorer`** : appelle `bridge.getDrives()`, `listDir`, `watchDir` au montage. Une réponse `null/undefined` mal gérée peut throw au render suivant.
3. **`useFocusManager` + `usePointerSystem`** : si un handler `pointerdown` modifie un état qui démonte conditionnellement un sous-arbre.
4. **`CogWindow` snap logic** : un `mousedown` sur la fenêtre déclenche peut-être un reposition qui casse.
5. **Overlay invisible** : un `<div fixed inset-0>` (DesktopAmbient, AIActivityOrb, WindowSwitcher) qui passe en `pointer-events:auto` + opacité 1 sur certains états.

### B2. Instrumentation
- Ajouter dans `DesktopErrorBoundary.componentDidCatch` un `console.error` explicite + stocker le stack dans `window.__lastDesktopError` pour debug.
- Ajouter un wrapper `window.addEventListener('error', ...)` et `unhandledrejection` dans `DesktopWidgetShellInner` (mount), qui logge avec préfixe `[DESKTOP-CRASH]`.
- Ajouter `console.log('[DESKTOP] click', e.target)` temporairement sur le container racine pour identifier ce qui suit le clic.

### B3. Fixes préventifs (à appliquer même sans repro)
1. **Garde `RealExplorerTab`** : envelopper son contenu dans un `<DesktopErrorBoundary>` local pour qu'un crash dans l'explorateur ne tue pas le shell.
2. **Garde async bridge** : dans `useRealFileExplorer`, wrapper toutes les `await bridge.xxx()` dans try/catch et retourner un état d'erreur visible plutôt que throw au render.
3. **ErrorBoundary fallback visible** : forcer son fond à `hsl(220 20% 4% / 1)` opaque + `z-[9999]` pour qu'on voie bien quand il se déclenche (et donc qu'on diagnostique le vrai bug).
4. **Vérifier overlay AIActivityOrb / DesktopAmbient** : s'assurer qu'aucun n'est `inset-0 pointer-events-auto` au-dessus du contenu.
5. **TerminalWindow** : si `xterm` ou autre lib charge un worker via chemin absolu, ça crash sous `file://`. Ajouter try/catch + fallback texte simple.

### B4. Validation
- Lancer `npx vite build && electron .` localement (instructions dans `electron/README.md`).
- Cliquer dans la fenêtre, observer les nouveaux logs `[DESKTOP-CRASH]` ou `[DesktopErrorBoundary]` pour identifier précisément le composant fautif.
- Si la cause exacte est trouvée → patch ciblé. Sinon, les gardes B3 confinent au minimum la casse.

---

## Partie C — Optimisation & complétude

- Vérifier que `useIconScale` (Ctrl+molette) re-fonctionne (régression mentionnée précédemment) : tracer le `wheel` listener et `settings.iconScale`.
- Vérifier le changement de wallpaper (image perso) : `Settings.tsx` upload → `update({ customWallpaper })` → `getWallpaperBackground` doit lire `wallpaperPreset === 'custom'`.
- Compléter le `TerminalWindow` mock (commandes : `help`, `ls`, `clear`, `echo`).
- Compléter context menus fichiers (déjà existants côté explorer ; vérifier connexion).

---

## Détails techniques

### Fichiers créés
- `src/pages/Desktop.tsx`

### Fichiers modifiés
- `src/App.tsx` — ajout route `/desktop`
- `src/pages/Index.tsx` — bouton « Ouvrir le bureau »
- `src/components/desktop/DesktopWidgetShell.tsx` — prop `forceWeb`, retire la dépendance Electron stricte
- `src/components/desktop/ErrorBoundary.tsx` — fallback opaque + z-index élevé + log enrichi
- `src/components/desktop/TerminalWindow.tsx` — fallback simulation web
- `src/hooks/useRealFileExplorer.ts` — try/catch sur tous les `await bridge.*`
- `src/hooks/useSettings.ts` / `useWallpaper.ts` / `useIconScale.ts` — vérification régressions
- `src/components/desktop/DesktopAmbient.tsx` — vérifier `pointer-events:none`

### Risques
- `RealExplorerTab` peut nécessiter plus de gardes que prévu si l'API mock du `useFileExplorer` est désynchronisée.
- Si le crash Electron vient d'un crash natif (worker, font), les fixes JS ne suffiront pas — il faudra chercher dans la console du processus principal.
