# Objectif

Reprendre proprement toute l’intégration Windows/Desktop qui est actuellement cassée, puis faire évoluer l’app Electron d’un simple HUD de widgets vers un vrai “bureau immersif” inspiré de la vue web actuelle et du mode Big Picture de Steam.

## Ce que j’ai identifié dans le code

### 1) Le mode desktop actuel est incohérent

- `useElectronMode.ts` force `html.electron-mode body { background: transparent }`
- `Index.tsx` bascule directement vers `DesktopWidgetShell`
- `DesktopWidgetShell` affiche surtout des overlays flottants, pas un bureau structuré
- `BridgeIndicator` est encore positionné en bas-droite alors que ton intention précédente était top-left
- `electron/main.js` crée bien une fenêtre transparente, mais `alwaysOnTop` est à `false` alors que toute l’archi widgets repose sur une logique overlay/click-through
- le résultat mélange “overlay transparent”, “pseudo desktop”, “fenêtre d’explorateur”, “shell Windows override”, donc rien n’est vraiment stabilisé

### 2) Le fond du mode web n’est pas réellement repris

Le web a une ambiance de fond claire dans `Index.tsx` + `index.css`, mais en Electron on annule ce fond au lieu de le réutiliser.  
Donc le desktop Electron ne ressemble pas à la version web.

### 3) L’intégration Windows actuelle est trop agressive

Le code de `electron/main.js` essaie déjà de rediriger l’explorateur Windows via registre + hooks shell. Vu ton message “rien ne marche”, il faut repartir sur une intégration fiabilisée :

- d’abord stabiliser le bureau et le bridge Electron
- ensuite réactiver les intégrations shell seulement si elles sont robustes
- éviter qu’un échec shell casse le desktop entier

### 4) Les erreurs de build actuelles viennent surtout de `useFileExplorer.ts`

Le hook suppose que `getDrives/getNetworkMounts/getListeningServices` retournent toujours un payload enrichi, mais `useSystemBridge.ts` peut renvoyer un fallback simplifié :

- `status` devient un `string`
- `source`, `lastUpdatedAt`, `error` n’existent pas toujours
=> c’est la cause directe des erreurs TS2322 / TS2339

### 5) Il faut aussi vérifier les fonctions backend

Les erreurs signalées sur :

- `supabase/functions/chat/ENHANCED_SYSTEM_PROMPT.ts`
- `supabase/functions/chat/index.ts`
- `supabase/functions/system-actions/index.ts`
demandent une passe de correction dédiée pour assurer que le build/lint redevienne propre.

## Direction de refonte

## Phase A — Stabiliser l’intégration Electron/Desktop

1. Revoir `electron/main.js`
  - remettre une configuration de fenêtre cohérente pour un vrai mode desktop
  - décider clairement entre :
    - mode bureau plein écran non traditionnel
    - ou mode widgets overlay
  - conserver le frameless + transparence seulement là où c’est utile
  - fiabiliser `setIgnoreMouseEvents` pour qu’il ne bloque pas l’interaction
2. Revoir `useElectronMode.ts`
  - ne plus rendre tout le body transparent par défaut
  - séparer :
    - `electron-desktop-mode`
    - `electron-widget-overlay-mode`
  - permettre au mode desktop de garder un vrai fond visuel
3. Revoir `Index.tsx`
  - faire du mode Electron un “desktop shell” complet
  - garder le fond visuel du web comme base du bureau Electron
  - injecter les widgets/apps par-dessus dans une composition propre

## Phase B — Transformer le HUD en vrai bureau type Big Picture

Créer une structure desktop plus lisible et immersive :

```text
DesktopShell
├── DesktopBackgroundLayer     ← reprend exactement l’ambiance visuelle web
├── DesktopTopBar / status rail
├── DesktopDock / launcher
├── DesktopCommandBar          ← centre bas
├── DesktopWorkspace           ← zone principale
├── DesktopWidgetsLayer        ← cartes flottantes / bridge / status
└── DesktopWindowsLayer        ← explorateur, apps, panneaux
```

### UX visée

- fond identique à la vue web actuelle, mais étendu à un vrai bureau
- composition plus “salon / interface immersive” à la Steam Big Picture
- éléments grands, lisibles, espacés, non “chat”
- bureau principal avant les widgets
- widgets comme modules contextuels, pas comme structure principale

## Phase C — Corriger toute l’intégration Windows actuelle

1. Assainir la logique shell/explorer dans `electron/main.js`
  - rendre la redirection shell optionnelle et résiliente
  - éviter que l’échec du registre ou du shell casse l’app
  - isoler les fonctions d’intégration Windows dans un bloc plus sûr
2. Vérifier `preload.js` + `useSystemBridge.ts`
  - aligner exactement les méthodes exposées
  - normaliser tous les retours du bridge
  - garantir des payloads typés stables côté React
3. Harmoniser `DesktopIconZone`, `FileExplorer`, `WindowFrame`
  - les intégrer dans une logique “apps du bureau”
  - éviter l’effet collage de composants indépendants

## Phase D — Corriger le build TypeScript

### D1) `useSystemBridge.ts`

Uniformiser les fallbacks de :

- `getDrives`
- `getNetworkMounts`
- `getListeningServices`

Ils devront retourner un objet strictement compatible avec `CacheBackedPayload<T>` :

- `success`
- `data`
- `status`
- `source`
- `lastUpdatedAt`
- `error`

### D2) `useFileExplorer.ts`

- typer explicitement les snapshots enrichis
- éviter l’accès direct à des propriétés qui n’existent pas sur les fallbacks actuels
- s’assurer que `ExplorerLoadStatus` reçoit uniquement les valeurs prévues

## Phase E — Corriger les erreurs dans les fonctions backend

Faire une passe dédiée sur :

- `supabase/functions/chat/index.ts`
- `supabase/functions/chat/ENHANCED_SYSTEM_PROMPT.ts`
- `supabase/functions/system-actions/index.ts`

Objectif :

- corriger les éventuels problèmes de typage/lint/format
- s’assurer que rien dans ces fonctions ne bloque le build global

## Fichiers impactés

- `electron/main.js`
- `electron/preload.js`
- `src/hooks/useElectronMode.ts`
- `src/pages/Index.tsx`
- `src/components/desktop/DesktopWidgetShell.tsx`
- `src/components/desktop/BridgeIndicator.tsx`
- `src/components/desktop/DesktopCommandBar.tsx`
- `src/components/desktop/DesktopSidePanel.tsx`
- `src/components/desktop/DesktopIconZone.tsx`
- `src/components/desktop/WindowFrame.tsx`
- `src/hooks/useSystemBridge.ts`
- `src/hooks/useFileExplorer.ts`
- `src/index.css`
- `supabase/functions/chat/index.ts`
- `supabase/functions/chat/ENHANCED_SYSTEM_PROMPT.ts`
- `supabase/functions/system-actions/index.ts`

## Résultat attendu

Après implémentation :

1. Le lancement Electron ouvre un vrai bureau immersif, pas une fenêtre classique ni un overlay cassé
2. Le fond reprend l’ambiance de la vue web actuelle
3. Le layout desktop rappelle Big Picture : grand, propre, spatial, lisible
4. Le bridge Windows/Desktop refonctionne proprement
5. L’explorateur et les apps du bureau s’intègrent comme de vraies surfaces système
6. Les erreurs TypeScript actuelles disparaissent
7. Les erreurs côté fonctions backend sont corrigées aussi
8. developper un system structurer pour gerer les composants et les cogWindows de notre app
9. faire tous les tests
10. je veux une orchestration parfaite
11. supprime le system de metric des perfs system
12. je ne veux plus de transparences sur les widgetsqui ont le focus
13. l'explorateur de fichier doit avoir exactement le meme bg que la vue web actuelle
14. notre explorateur doit pouvoir remplacer facilement l'explorateur windows natif et repondre a tous ses evenements aussi
15. je ne veux plus que le CoInput soit visible au lancement et devra repondre a la com crtl+k
16. et je veux un DnD sur tous les composants appropriés 
17. pour finir optimise profondement les performances, exploite profondement les services de la .env
18. prend tout ton temps pour tester et finaliser le projet
19. n'hesite pas a creer de nouveaux composants