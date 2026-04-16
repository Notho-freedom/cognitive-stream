

# Plan: Refonte complète Desktop Immersif + Explorer Production-Grade

## Résumé
Transformer l'app Electron d'un overlay transparent cassé en un vrai bureau immersif style Big Picture, corriger tous les bugs TS, supprimer le système de métriques, ajouter DnD, Ctrl+K, et un système de fenêtres cognitives (CogWindow).

---

## Phase 1 — Corriger le bug critique `electron/main.js`

**Fichier**: `electron/main.js` ligne 909
- `includeLegacy` n'est jamais déclaré dans `clearManagedShellOverrides()` → remplacer par `true` (comportement legacy par défaut)

## Phase 2 — Supprimer le système de métriques

**Supprimer** `src/hooks/useSystemMetrics.ts` — n'est importé nulle part.

**Modifier** `src/components/desktop/DesktopSidePanel.tsx` :
- Retirer les props `metrics` et `isAvailable` (plus utilisées car `DesktopWidgetShell` passe déjà `null`/`false`)
- Retirer l'onglet "STATUT" (CPU/RAM/GPU/Disk/Net) qui affiche toujours "N/A"
- Ne garder que l'onglet "CONFIG" (settings)
- Simplifier le composant en panneau de settings pur

**Modifier** `src/components/desktop/DesktopWidgetShell.tsx` :
- Retirer `metrics={null}` et `isAvailable={false}` du `DesktopSidePanel`

## Phase 3 — Bureau immersif (Big Picture)

### 3a. `electron/main.js` — `createWindow()`
- Passer `transparent: false` et `backgroundColor: '#060a14'` (le fond void du CSS)
- Passer `alwaysOnTop: false`, `skipTaskbar: false`, `resizable: true`, `movable: true`
- Retirer `setIgnoreMouseEvents(true, { forward: true })` — plus besoin avec un vrai bureau
- Garder `frame: false` pour le frameless

### 3b. `src/hooks/useElectronMode.ts`
- Retirer toute logique de transparence
- Garder juste la détection `isElectron`

### 3c. `src/components/desktop/DesktopWidgetShell.tsx`
- Restructurer en couches :
  - `DesktopBackground` — même fond que `body` CSS (gradients + noise)
  - `DesktopTopBar` — nouveau composant : heure, indicateur bridge, nom machine
  - Zone centrale — espace pour les CogWindows
  - `DesktopCommandBar` — reste en bas-centre, invisible par défaut, Ctrl+K
- Le fond du shell reprend exactement le background du `body` dans `index.css`
- Les widgets avec le focus deviennent opaques (surfaceOpacity → 1.0)

### 3d. Nouveau: `src/components/desktop/DesktopTopBar.tsx`
- Barre supérieure minimaliste : horloge, BridgeIndicator intégré, nom machine
- Remplace le BridgeIndicator flottant

## Phase 4 — Système CogWindow

### Nouveau: `src/hooks/useCogWindowManager.ts`
- Gère un registre de fenêtres ouvertes (id, type, position, size, z-index, state)
- Actions: open, close, minimize, maximize, focus (z-index), drag, resize
- Une fenêtre avec le focus → `surfaceOpacity: 1.0` (pas de transparence)

### Nouveau: `src/components/desktop/CogWindow.tsx`
- Wrapper générique pour toutes les apps du bureau
- Utilise `WindowFrame` pour le chrome (titre, boutons min/max/close)
- Drag via header (react-dnd ou pointer events)
- Resize via bordures
- z-index dynamique via le manager

### Intégration
- `FileExplorer` s'ouvre dans un `CogWindow`
- `FloatingResponseCard` reste flottante (pas dans CogWindow) — c'est le système de réponse IA
- Les cartes de réponse IA gardent le comportement actuel

## Phase 5 — CommandBar Ctrl+K

**Modifier** `src/components/desktop/DesktopWidgetShell.tsx` :
- `commandBarVisible` reste `false` au lancement (déjà le cas)
- Le listener `Ctrl+K` existe déjà dans `DesktopCommandBar` — vérifier qu'il fonctionne

**Modifier** `src/components/desktop/DesktopCommandBar.tsx` :
- S'assurer que le `useEffect` pour Ctrl+K est bien branché sur `onToggleVisible`
- Ajouter animation d'apparition/disparition plus fluide

## Phase 6 — Explorer = même fond que le web

**Modifier** `src/components/explorer/FileExplorer.tsx` :
- Le fond de l'explorateur reprend exactement le background CSS du body (gradients radials + noise)
- Quand l'explorateur a le focus → opacité 1.0, pas de transparence

## Phase 7 — Explorer Windows Native Replacement

**Modifier** `electron/main.js` :
- Les handlers shell (`applyWindowsShellIntegration`, `selfHealWindowsShellIntegration`) existent déjà
- Fix le bug `includeLegacy` (Phase 1)
- S'assurer que les handlers `second-instance`, `explorer:open-request`, et le script PowerShell fonctionnent proprement
- Rendre le tout résilient : wrap chaque opération registre dans try/catch

**Modifier** `electron/explorer-shell.js` : 
- Vérifier que `armTakeover`, `restoreNativeShell` sont robustes

## Phase 8 — Drag & Drop

### Nouveau: `src/hooks/useDragDrop.ts`
- Hook générique pour le DnD de fichiers dans l'explorateur
- Utilise HTML5 Drag and Drop API (natif, performant)
- Supporte : déplacement de fichiers entre dossiers, drop sur sidebar, drop sur zones de l'explorateur

### Intégration dans l'explorateur
- `FileExplorerContent` : items draggables
- `FileExplorerSidebar` : zones de drop (accès rapides, dossiers)
- Feedback visuel : highlight de la zone de drop, ghost image

### CogWindow DnD
- Les fenêtres CogWindow sont déplaçables via leur barre de titre (pointer events, pas HTML5 DnD)

## Phase 9 — Performances

- Memoization agressive : `React.memo` sur les composants lourds (`FileExplorerContent`, `FloatingResponseCard`)
- `useMemo`/`useCallback` déjà bien utilisés — vérifier qu'il n'y a pas de re-renders inutiles
- Virtualisation liste fichiers : utiliser `@tanstack/react-virtual` pour les grandes listes
- Lazy load du panneau de preview
- Debounce search dans l'explorateur (déjà partiel, compléter)

## Phase 10 — Corrections backend

**`supabase/functions/chat/index.ts`** et **`ENHANCED_SYSTEM_PROMPT.ts`** : ces fichiers semblent propres, pas d'erreurs évidentes. Vérifier le build Deno.

**`supabase/functions/system-actions/index.ts`** : propre également. Pas de corrections nécessaires sauf si des erreurs de lint apparaissent.

---

## Fichiers créés
- `src/components/desktop/DesktopTopBar.tsx`
- `src/components/desktop/CogWindow.tsx`
- `src/hooks/useCogWindowManager.ts`
- `src/hooks/useDragDrop.ts`

## Fichiers modifiés
- `electron/main.js` — fix `includeLegacy`, `createWindow()` non-transparent
- `src/hooks/useElectronMode.ts` — simplifier
- `src/components/desktop/DesktopWidgetShell.tsx` — restructurer en bureau immersif
- `src/components/desktop/DesktopSidePanel.tsx` — retirer métriques
- `src/components/desktop/DesktopCommandBar.tsx` — polish Ctrl+K
- `src/components/explorer/FileExplorer.tsx` — fond web, intégration CogWindow
- `src/components/explorer/FileExplorerContent.tsx` — DnD + virtualisation

## Fichiers supprimés
- `src/hooks/useSystemMetrics.ts`

