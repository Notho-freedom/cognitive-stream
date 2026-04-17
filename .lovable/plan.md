

# Plan : Bureau immersif plein écran + corrections explorateur + animations

## Synthèse des objectifs utilisateur
1. Lancement plein écran (fullscreen, pas une fenêtre)
2. Supprimer le widget `DesktopIconZone` → icônes directement sur le bureau, miniatures, **cache persistant**
3. La TopBar devient une vraie **barre des tâches** (en bas, façon Windows)
4. Au lancement, l'app **prend la place de l'explorateur Windows** (takeover automatique + Win+E)
5. **Corriger l'explorateur** : actuellement il tourne en boucle quand on ouvre un dossier puis plante
6. **Animation de démarrage** style OS (LoadingScreen existe déjà → l'intégrer + l'améliorer)
7. **Panel de test des composants cognitifs** (notifications, schémas, réponses) dans le panneau droit
8. CommandBar Ctrl+K (déjà OK)

---

## Phase 1 — Plein écran + barre des tâches en bas

### `electron/main.js` `createWindow()`
- Ajouter `fullscreen: true` (occupe tout l'écran y compris derrière la barre des tâches Windows)
- Garder `frame: false`, `backgroundColor: '#060a14'`
- Au démarrage : `mainWindow.setFullScreen(true)` + `setMenuBarVisibility(false)`

### `DesktopTopBar.tsx` → renommer / repositionner en `DesktopTaskbar.tsx`
- Position : `fixed bottom-0` (au lieu de top-0), hauteur ~40px
- Contenu : bouton "Démarrer" (logo cognitive ◈) à gauche, fenêtres ouvertes (CogWindows) au centre, horloge + status bridge + brain mode à droite
- Le bouton démarrage ouvre un menu qui liste les apps disponibles (Explorer, Test Panel, etc.)
- Plus aucun élément en haut de l'écran → bureau totalement libre

### `DesktopWidgetShell.tsx`
- Retirer `DesktopTopBar`, ajouter `DesktopTaskbar` en bas
- Décaler les zones : floating cards `top: 0` → `bottom: 48`, CogWindows zone idem
- Retirer le `top: 40` des layers

---

## Phase 2 — Icônes directement sur le bureau + cache persistant

### Supprimer `DesktopIconZone.tsx` (le widget encadré)

### Nouveau composant : `src/components/desktop/DesktopIconsLayer.tsx`
- Plein écran, `fixed inset-0`, `pointer-events: none` au conteneur, `pointer-events: auto` sur chaque icône
- Grid CSS auto-fill (colonnes ~80px), padding 24px haut/gauche
- Icônes **miniatures** : 40px image + label 10px (vs 56px actuel)
- Style sobre type Windows : pas de cadre futuriste, juste icône + label avec text-shadow
- Sélection (clic = highlight, double-clic = ouvrir)
- Drag & drop pour réorganiser (positions persistées)

### `useDesktopIcons.ts` — cache persistant
- Sauvegarder `icons` + `iconCache` (data URLs des icônes résolues) dans `localStorage` (clé `desktop:icons:cache:v1`)
- Au mount : **charger immédiatement le cache** → pas d'écran vide / loader visible
- Refresh en arrière-plan, mise à jour silencieuse seulement si diff
- Persister aussi les positions custom (drag) dans `localStorage`

### `DesktopWidgetShell.tsx`
- Remplacer `<DesktopIconZone />` par `<DesktopIconsLayer />`
- Retirer le toggle `showDesktopApps` du panel (icônes toujours visibles)

---

## Phase 3 — Corriger l'explorateur (boucle infinie + crash)

### Problème identifié dans `useFileExplorer.ts`
`selection.clear()` est dans la dépendance de `loadVirtualLocation`/`loadRealDirectory`. Si `selection` est recréé à chaque render → boucle infinie de `loadLocation` → `useFileSelection` recreates → re-render → re-fetch.

### Corrections
- `useFileSelection` : vérifier que les fonctions retournées sont stables (`useCallback` avec deps stables)
- `loadVirtualLocation`, `loadRealDirectory` : retirer `selection` des deps, utiliser une ref `selectionRef` pour appeler `clear()` sans recréer le callback
- `loadLocation` : pareil, dépendre uniquement de `loadRealDirectory` et `loadVirtualLocation`
- Ajouter un guard `if (lastLoadedPath.current === targetPath && !force) return` dans `loadLocation`

### CogWindow integration
- Vérifier que `FileExplorerEmbedded` ne re-mount pas à chaque render du shell (déjà memo)
- Ajouter une key stable basée sur `win.id` uniquement

---

## Phase 4 — Takeover auto au lancement + Win+E

### `electron/main.js` `bootstrapApp()`
- Forcer `settings.explorerTakeoverEnabled = true` au premier lancement (pas optionnel)
- Appeler `explorerShell.armTakeover()` systématiquement après `createWindow()`
- Logger en cas d'échec mais ne pas désactiver

### Win+E hotkey
- Enregistrer `globalShortcut.register('Super+E', ...)` (Windows key + E) pour ouvrir notre explorateur via `enqueueExplorerOpen(null, 'hotkey')`
- Dans `app.whenReady()`, après bootstrap

### Side panel
- Garder le toggle `explorerTakeoverEnabled` mais avec valeur par défaut `true`

---

## Phase 5 — Animation de démarrage style OS

### Intégrer `LoadingScreen` (existe déjà) dans `Index.tsx` ou `DesktopWidgetShell`
- Afficher au tout premier mount, avant le rendu du shell
- Durée min 2.5s, séquence visible : INIT → MODULES → BRIDGE → AI → READY
- Fade out propre sur le bureau

### Améliorations LoadingScreen
- Ajouter un quatrième StatusLine "BUREAU" qui passe à OK quand bridge ready + icônes cache chargées
- Texte "COGNITIVE STREAM OS" plus impactant
- Un petit flash final "WELCOME" avant disparition

---

## Phase 6 — Panel de test des composants cognitifs

### `DesktopSidePanel.tsx` — ajouter onglets
Restructurer en 2 onglets : **CONFIG** (existant) + **TEST**

### Nouveau : section TEST dans le panel
Boutons pour déclencher manuellement :
- **Notification info / success / warning / error** (4 boutons → `notifyPush`)
- **Réponse texte simple** → push une `FloatingResponseCard` avec un schéma `{ blocks: [{ type:'text' }] }`
- **Réponse riche** (liste + boutons + badge) → schéma de démo
- **Erreur** → `floatingCards.pushError("Erreur de test")`
- **Pensée** → `notifyPush` avec priority low + simulation thought
- **Ouvrir explorateur** sur un chemin de test
- **Action confirmation** → simule `pendingConfirmation`
- **Question** → simule `pendingQuestion`

### Connexion
- `DesktopWidgetShell` passe `notifyPush`, `floatingCards`, schémas de démo au panel via props

---

## Phase 7 — Drag & drop icônes bureau

- Hook `useDragDrop` (existe déjà) appliqué aux icônes
- Position custom enregistrée dans localStorage par path
- Snap à la grille (cellule 80x96)

---

## Fichiers impactés

**Créés** :
- `src/components/desktop/DesktopTaskbar.tsx` (renommage TopBar → bas)
- `src/components/desktop/DesktopIconsLayer.tsx`
- `src/components/desktop/CognitiveTestPanel.tsx`

**Modifiés** :
- `electron/main.js` — fullscreen + globalShortcut Win+E + takeover par défaut
- `src/components/desktop/DesktopWidgetShell.tsx` — taskbar bas, icons layer, loading screen, test panel
- `src/components/desktop/DesktopSidePanel.tsx` — onglets CONFIG/TEST
- `src/components/cognitive/LoadingScreen.tsx` — séquence OS améliorée
- `src/hooks/useDesktopIcons.ts` — cache localStorage persistant
- `src/hooks/useFileExplorer.ts` — fix boucle infinie (deps selection)
- `src/hooks/useFileSelection.ts` — stabiliser callbacks

**Supprimés** :
- `src/components/desktop/DesktopIconZone.tsx` (remplacé par DesktopIconsLayer)
- `src/components/desktop/DesktopTopBar.tsx` (remplacé par DesktopTaskbar)

## Résultat attendu
1. Lancement Electron → animation OS 2.5s → bureau plein écran
2. Icônes du bureau visibles instantanément (cache)
3. Barre des tâches en bas avec horloge, fenêtres, démarrer
4. Win+E ou ouverture de dossier → notre explorateur (qui charge correctement, sans boucle)
5. Panel droit : config + tests cognitifs
6. CommandBar Ctrl+K (inchangé)

