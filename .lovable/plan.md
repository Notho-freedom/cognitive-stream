

# Plan : Stabilisation + Personnalisation + Settings

## Phase A — Bugs critiques du log (priorité 1)

**A1. Boucle infinie `DesktopWidgetShell.tsx:190`**
Cause : `useEffect([..., openExplorer])` ligne 187-198 — `openExplorer` est recréé à chaque render car ses deps incluent `cogWindows` (objet recréé chaque render). Effet → `setState` → render → nouveau `openExplorer` → effet → loop.
Fix : retirer `openExplorer` des deps de l'effet, utiliser une ref `openExplorerRef`. Idem `getExplorerSettings/notifyExplorerReady/onExplorerOpenRequest` (déjà stables mais on les fige par ref).

**A2. Boucle infinie `useVoiceInput.ts:101`**
Cause : `onFinalTranscript` est passé en inline arrow ligne 78 → recréé chaque render → effet ligne 56 re-monte le `SpeechRecognition` → `setState(isSupported)` → render → boucle.
Fix : stocker `onFinalTranscript` dans une `useRef` mise à jour à chaque render, retirer de `[language, onFinalTranscript]` → ne garder que `[language]`.

**A3. `CogList` crash "Objects are not valid as a React child"**
Cause : `CognitiveTestPanel` envoie `items: [{ label, value }, ...]` à un `CogList` qui rend `{item}` directement comme string ligne 105.
Fix : dans `CogList.tsx`, normaliser chaque item — si objet `{label, value}` → afficher `label : value`. Et dans le test panel, utiliser plutôt un `keyValue` block ou items strings.

## Phase B — Auto-fermeture des gadgets (priorité 1)

**B1. `FloatingResponseCard` ne se ferme pas après la barre**
La barre de progression ligne 200-207 est purement visuelle. Le `setTimeout` ligne 68-77 dépend de `isComplete && card.text` — pour les schémas (sans text), `isComplete` reste `true` mais autoDismiss tourne. Vérifier le timer avec `card.id+timestamp`. En réalité c'est correct mais `setIsComplete(true)` ne se déclenche que si `!card.text`. **Problème : timer est reset chaque hover si on touche les deps.** À renforcer + garantir un fallback `useEffect` qui force fermeture après `autoDismissMs + 500`.

**B2. Notifications : 2 modes**
- `dismissible: false` ou priority `low/medium` → autofermante via TTL existant ✓
- `dismissible: true` priority `high/critical` → durée actuelle trop courte. Ajouter une **TTL max absolue** de 60s. Implémenter dans `NotificationProvider.push` : `ttl = min(notif.ttl ?? defaultTTL, 60000)` avec garantie `setTimeout` global qui supprime après 60s même si l'item ne re-render pas.

## Phase C — Icônes du bureau (priorité 2)

**C1. Icônes par défaut quand le résolveur échoue**
Dans `DesktopIconsLayer`, quand `getFileIcon` retourne `null` (disque externe déconnecté, .lnk cassé), afficher une icône par défaut basée sur l'extension :
- `.lnk` → icône "raccourci" générique (SVG inline)
- `.exe` → icône app
- `.url` → icône web
- dossier → icône dossier
Créer `src/components/desktop/DefaultFileIcon.tsx` avec mapping extension → SVG GX.

**C2. Ctrl+molette pour redimensionner**
Ajouter un état `iconScale` (0.6 → 1.6) persisté dans localStorage clé `desktop:icons:scale`. Listener `wheel` global avec `e.ctrlKey` → ajuste `iconScale` par pas de 0.1. Appliquer via CSS `transform: scale(...)` ou recalcul `CELL_W/H * scale`.

**C3. Rectangle de sélection**
Nouveau composant `SelectionRectangle.tsx` : sur `mousedown` sur le fond du `DesktopIconsLayer`, démarre le tracking, dessine un rect bleu translucide, sur `mouseup` calcule l'intersection avec chaque icône → `setSelectedIds`. Multi-sélection (`selectedIds: Set<string>`).

## Phase D — Barre des tâches & menu démarrer (priorité 2)

**D1. Redesign sans cloner Windows**
`DesktopTaskbar` actuel : trop linéaire. Nouveau design :
- **Centre** : "dock" horizontal des CogWindows ouvertes, chaque item est un mini-thumbnail GX (cadre angulaire, pulse si focus)
- **Gauche** : un bouton "◈" qui ouvre un **CommandPalette radial** (pas un menu liste classique) — apps disposées en cercle autour du clic
- **Droite** : horloge minimaliste + brain mode + bridge dot
- Animation : taskbar a un léger glow vertical au survol des items

**D2. Menu démarrer = palette radiale**
Nouveau composant `StartRadialMenu.tsx` : 6 items max disposés en arc, clic central pour fermer. Items = Explorer, Terminal IA, Settings, Test Panel, Notifications log, Quit.

## Phase E — Terminal IA (CommandBar) (priorité 2)

**E1. Le rendre déplaçable**
`DesktopCommandBar` est actuellement `fixed bottom-6 left-1/2`. Wrap dans le système drag (comme `FloatingResponseCard`) : header drag-handle, position persistée localStorage. Reste accessible Ctrl+K.

**E2. Placement dans le bureau**
Conserver Ctrl+K + ajout d'un raccourci dans le menu radial + dans la taskbar (icône `⌘`). Ne PAS le coller au panel droit (trop intrusif).

## Phase F — Panel droit transformé

**F1. Retirer l'onglet "Test" du panel**
Le panel droit perd l'onglet test. Il devient un **panneau d'activité** :
- Liste des notifications passées (historique 30 dernières)
- Liste des cartes flottantes actives + bouton "tout fermer"
- Statut bridge / brain compact

**F2. Test panel devient un CogWindow**
Nouveau composant `TestPanelWindow` ouvert via menu radial → `cogWindows.open('tests', 'PANEL DE TEST')`. Réutilise `CognitiveTestPanel` existant.

## Phase G — Page de paramètres complète (priorité 1)

**G1. Nouvelle route `/settings`**
Créer `src/pages/Settings.tsx` avec sections :
1. **Apparence** — wallpaper (presets + URL + upload), opacité surface, police (3 options), couleur accent
2. **Comportement** — Ctrl+molette icônes on/off, snap grille on/off, animations
3. **Audio** — TTS, sons UI, voix vocale
4. **Système** — explorer takeover, démarrage auto fullscreen, hotkeys
5. **Cognitif** — autonomy level, fallback chain
6. **À propos**

**G2. Migration depuis `DesktopSidePanel`**
Tout le contenu actuel de l'onglet Config part dans `/settings`. Le panel garde uniquement le bouton "⚙ Paramètres" qui ouvre Settings dans un CogWindow plein écran.

**G3. Wallpaper personnalisé**
État `wallpaper` persisté localStorage clé `desktop:wallpaper`. Appliqué dynamiquement sur le `DesktopWidgetShell` background. 4 presets GX (cyan void par défaut, purple haze, green matrix, monochrome) + custom URL/upload.

## Phase H — Menus contextuels (priorité 1)

**H1. Composant générique `CogContextMenu.tsx`**
Style GX (bordures angulaires, glassmorphism, animations Framer). API :
```ts
<CogContextMenu items={[{ label, icon, action, danger? }]} />
```

**H2. Branchement sur :**
- **Bureau** (clic droit fond) : Actualiser, Nouveau dossier, Coller, Trier par, Affichage, Personnaliser → /settings
- **Icône bureau** : Ouvrir, Renommer, Supprimer, Propriétés, Ouvrir avec...
- **Carte flottante** : Épingler, Fermer, Copier, Exporter
- **CogWindow header** : Réduire, Maximiser, Fermer, Toujours visible
- **Taskbar item** : Restaurer, Réduire, Fermer

## Phase I — Drag & drop sur tous les gadgets

Tous les gadgets utilisateurs deviennent déplaçables via une header drag-handle :
- ✓ FloatingResponseCard (déjà fait)
- ✓ CogWindow (déjà fait)
- → DesktopCommandBar (Phase E1)
- → Panel droit (rendre détachable optionnel)
- ✗ Notifications restent collées top-right (par design utilisateur)

## Phase J — Lancement applications natives Windows

Aucun changement nécessaire — `DesktopIconsLayer.handleOpen` utilise déjà `Start-Process` qui délègue à Windows. Confirmer dans `electron/main.js` que `setIgnoreMouseEvents` n'est jamais appelé en mode plein écran (sinon impossible de cliquer sur une fenêtre native ouverte par-dessus). Notre app reste en arrière-plan, les apps natives s'affichent par-dessus naturellement.

## Phase K — Animations bureau supplémentaires

- Particules ambiantes lentes (10 points GX qui dérivent)
- Scan-line subtile horizontale toutes les 8s
- Ripple au clic sur le fond
- Glow contextuel autour de la souris (très subtil)

---

## Fichiers créés
- `src/pages/Settings.tsx`
- `src/components/desktop/DefaultFileIcon.tsx`
- `src/components/desktop/SelectionRectangle.tsx`
- `src/components/desktop/StartRadialMenu.tsx`
- `src/components/desktop/CogContextMenu.tsx`
- `src/components/desktop/DesktopAmbient.tsx` (animations bureau)
- `src/components/desktop/TestPanelWindow.tsx`
- `src/hooks/useIconScale.ts`
- `src/hooks/useWallpaper.ts`
- `src/hooks/useContextMenu.ts`
- `src/hooks/useMultiSelection.ts`

## Fichiers modifiés
- `src/components/desktop/DesktopWidgetShell.tsx` — fix loop, wallpaper, ambient, context menus, route settings
- `src/hooks/useVoiceInput.ts` — fix loop avec ref
- `src/components/cognitive/dynamic/primitives/CogList.tsx` — accepter `{label,value}` items
- `src/components/desktop/CognitiveTestPanel.tsx` — schémas valides
- `src/components/cognitive/NotificationQueue.tsx` — TTL max 60s + safety timer
- `src/components/desktop/FloatingResponseCard.tsx` — fallback fermeture forcée
- `src/components/desktop/DesktopTaskbar.tsx` — redesign + menu radial
- `src/components/desktop/DesktopCommandBar.tsx` — drag + position persistée
- `src/components/desktop/DesktopIconsLayer.tsx` — défaut icons + scale + multi-select + context menu
- `src/components/desktop/DesktopSidePanel.tsx` — devient panneau activité
- `src/App.tsx` — ajout route `/settings`

## Résultat attendu
1. Plus aucune boucle infinie au chargement
2. CogList ne crash plus sur les schémas test
3. Toutes les cartes/notifs disparaissent automatiquement (TTL max 60s pour les manuelles)
4. Icônes par défaut visibles même quand le binaire est introuvable
5. Ctrl+molette ajuste la taille des icônes
6. Sélection rectangulaire au glisser sur le bureau
7. Taskbar redesignée avec menu radial GX (pas un clone Windows)
8. Terminal IA déplaçable, accessible Ctrl+K et menu radial
9. Page Settings complète (wallpaper, fonts, comportement)
10. Menus contextuels GX partout
11. Apps Windows continuent à fonctionner par-dessus notre bureau
12. Animations ambiantes vivifient le bureau

