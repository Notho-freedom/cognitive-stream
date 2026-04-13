# Plan : Explorateur de Fichiers Complet + Fix Build

## Fix immédiat

**useVoiceInput.ts** : Remplacer `window.SpeechRecognition` par un cast via `(window as any).SpeechRecognition` pour supprimer les erreurs TS2551.

## Explorateur de fichiers

### Architecture

```text
src/components/explorer/
├── FileExplorer.tsx          # Composant principal (fenêtre complète)
├── FileExplorerToolbar.tsx   # Barre d'outils (navigation, recherche, vue)
├── FileExplorerSidebar.tsx   # Panneau latéral (accès rapides, disques, réseau)
├── FileExplorerContent.tsx   # Zone principale (grille/liste de fichiers)
├── FileExplorerBreadcrumb.tsx # Fil d'Ariane du chemin actuel
├── FileExplorerStatusBar.tsx # Barre de statut (nb éléments, taille, espace disque)
├── FileExplorerContextMenu.tsx # Menu contextuel (clic droit)
├── FileExplorerPreview.tsx   # Panneau de prévisualisation (fichiers texte/image)
└── useFileExplorer.ts        # Hook principal (état, navigation, opérations)
```

### Fonctionnalités complètes

**Navigation :**

- Fil d'Ariane cliquable par segment
- Boutons Précédent/Suivant/Parent (historique de navigation)
- Barre d'adresse éditable (saisie directe d'un chemin)
- Double-clic pour entrer dans un dossier ou ouvrir un fichier

**Panneau latéral (pages clés) :**

- **Accès rapides** : Bureau, Documents, Téléchargements, Images, Musique, Vidéos
- **Disques système** : Détection via `system:metrics` (C: D: etc. ou /dev/sdX sur Linux) avec barres d'espace utilisé
- **Réseau** : Interfaces réseau détectées (info only, via metrics.network)
- **Ce PC** : Nom machine, OS, architecture

**Barre d'outils :**

- Boutons navigation (back/forward/up/home)
- Toggle vue grille / vue liste / vue détails
- Recherche dans le dossier courant (grep via bridge)
- Toggle fichiers cachés
- Bouton nouveau dossier / nouveau fichier
- Bouton actualiser

**Zone de contenu :**

- 3 modes d'affichage : icônes (grille), liste compacte, détails (colonnes triables : nom, taille, date, type)
- Tri par nom/taille/date (asc/desc)
- Sélection multiple (Ctrl+clic, Shift+clic)
- Icônes natives via `getFileIcon` du bridge

**Menu contextuel (clic droit) :**

- Ouvrir / Ouvrir avec
- Copier le chemin
- Renommer
- Supprimer (avec confirmation)
- Nouveau dossier / Nouveau fichier
- Propriétés (taille, dates, permissions)

**Barre de statut :**

- Nombre d'éléments dans le dossier courant
- Taille totale sélection
- Espace disque du volume courant

**Prévisualisation :**

- Panneau droit togglable
- Affiche le contenu des fichiers texte (< 100KB)
- Affiche les métadonnées pour les autres

### Intégration desktop

Le `FileExplorer` sera accessible :

1. Via la `DesktopCommandBar` (commande "explorateur" ou "ouvrir dossier X")
2. Via double-clic sur un dossier dans `DesktopIconZone`
3. Rendu comme une `FloatingResponseCard` de type spécial "explorer" (plus grande, redimensionnable)

Un nouveau hook `useFileExplorer.ts` gèrera tout l'état (chemin courant, historique, sélection, opérations CRUD) en utilisant `useSystemBridge`.

### Ajouts IPC Electron

Ajouter dans `electron/main.js` + `preload.js` :

- `fs:rename` — renommer fichier/dossier
- `fs:mkdir` — créer un dossier
- `fs:stat` — obtenir les stats détaillées (permissions, dates creation/access/modif)
- `fs:drives` — lister les disques montés (Windows: `wmic logicaldisk`, Linux: `df -h`, macOS: `diskutil list`)
- `fs:copy` — copier fichier/dossier

### Style

Même design HUD/glassmorphic que le reste : `FuturisticFrame`, fond semi-transparent, accents cyan, animations framer-motion subtiles.

## Fichiers impactés

- `src/hooks/useVoiceInput.ts` — fix TS build
- `electron/main.js` — nouveaux IPC handlers (rename, mkdir, stat, drives, copy)
- `electron/preload.js` — exposer les nouvelles API
- `src/hooks/useSystemBridge.ts` — ajouter les nouvelles méthodes
- `src/components/explorer/*` — tous les composants explorateur (nouveaux)
- `src/hooks/useFileExplorer.ts` — hook état explorateur (nouveau)
- `src/components/desktop/DesktopWidgetShell.tsx` — intégrer l'explorateur
- `src/components/desktop/DesktopIconZone.tsx` — ouvrir explorateur sur double-clic dossier  
  
  
  
  
Ton plan est déjà solide — là on va le transformer en **système production-grade**, modulaire, scalable, et prêt pour évoluer vers un OS-like sérieux (SkyOS vibes 👀).
  Je vais te restructurer ça comme une **archi + roadmap + contracts + edge cases**, façon dev senior qui prépare un truc qui peut tenir 2 ans sans refacto majeure.
  ---
  # 🧠 1. Vision (niveau système)
  Ton explorateur = pas un composant UI  
  👉 c’est un **module système** avec 3 couches :
  ```text
  UI Layer (React)
  ↓
  State Layer (hooks + store)
  ↓
  System Layer (Electron IPC + FS)

  ```
  Objectif :
  - découplage total UI / logique
  - testabilité
  - extensibilité (plugins, cloud, remote FS plus tard)
  ---
  # 🧩 2. Architecture améliorée
  ## 📁 Structure complète
  ```text
  src/
  ├── components/explorer/
  │   ├── FileExplorer.tsx
  │   ├── layout/
  │   │   ├── ExplorerLayout.tsx
  │   │   ├── ExplorerSplitView.tsx   # resize panels
  │   │   └── ExplorerPanel.tsx
  │   │
  │   ├── toolbar/
  │   │   ├── FileExplorerToolbar.tsx
  │   │   ├── AddressBar.tsx
  │   │   └── SearchBar.tsx
  │   │
  │   ├── sidebar/
  │   │   ├── FileExplorerSidebar.tsx
  │   │   ├── SidebarSection.tsx
  │   │   └── SidebarItem.tsx
  │   │
  │   ├── content/
  │   │   ├── FileExplorerContent.tsx
  │   │   ├── FileGridView.tsx
  │   │   ├── FileListView.tsx
  │   │   ├── FileDetailsView.tsx
  │   │   └── FileItem.tsx
  │   │
  │   ├── preview/
  │   │   ├── FileExplorerPreview.tsx
  │   │   ├── TextPreview.tsx
  │   │   ├── ImagePreview.tsx
  │   │   └── UnsupportedPreview.tsx
  │   │
  │   ├── context/
  │   │   ├── FileExplorerContextMenu.tsx
  │   │   └── contextActions.ts
  │   │
  │   ├── status/
  │   │   └── FileExplorerStatusBar.tsx
  │   │
  │   └── breadcrumb/
  │       └── FileExplorerBreadcrumb.tsx
  │
  ├── hooks/
  │   ├── useFileExplorer.ts
  │   ├── useFileOperations.ts
  │   ├── useFileSelection.ts
  │   ├── useNavigationHistory.ts
  │   └── useDirectoryWatcher.ts   # 🔥 temps réel
  │
  ├── services/
  │   ├── fileSystem.service.ts
  │   ├── fileCache.service.ts
  │   ├── search.service.ts
  │   └── icon.service.ts
  │
  ├── types/
  │   └── explorer.types.ts

  ```
  ---
  # ⚙️ 3. Modélisation des données (ULTRA important)
  ## 📦 File Entity
  ```ts
  type FileEntity = {
    id: string
    name: string
    path: string
    type: 'file' | 'directory'
    size: number
    extension?: string
    mimeType?: string
    createdAt: number
    updatedAt: number
    accessedAt?: number
    isHidden: boolean
    isReadonly: boolean
    permissions?: string
    icon?: string
  }

  ```
  ---
  ## 📂 Explorer State
  ```ts
  type ExplorerState = {
    currentPath: string
    files: FileEntity[]
    selected: string[]
    viewMode: 'grid' | 'list' | 'details'
    sort: {
      field: 'name' | 'size' | 'date'
      order: 'asc' | 'desc'
    }
    history: {
      back: string[]
      forward: string[]
    }
    showHidden: boolean
    previewFile?: FileEntity
  }

  ```
  ---
  # 🔌 4. IPC Electron (version PRO)
  Tu avais la base — voici la version robuste :
  ## 📡 FS Core
  ```text
  fs:readDir
  fs:readFile
  fs:writeFile
  fs:delete
  fs:rename
  fs:mkdir
  fs:copy
  fs:move   ← 🔥 important
  fs:stat
  fs:exists

  ```
  ---
  ## 💽 System
  ```text
  fs:drives
  system:metrics
  system:info

  ```
  ---
  ## 🔍 Search (optimisé)
  ```text
  fs:search

  ```
  👉 backend :
  - Windows → `where /r`
  - Linux/mac → `find` ou `ripgrep` (🔥 très rapide)
  ---
  ## 👀 Watcher (temps réel 🔥)
  ```text
  fs:watch
  fs:unwatch

  ```
  👉 basé sur :
  - `chokidar` (cross-platform)
  ---
  # 🧠 5. Hooks spécialisés (clean architecture)
  ## 🧭 useNavigationHistory
  - back()
  - forward()
  - push(path)
  ---
  ## 📂 useFileSelection
  - select(fileId)
  - multiSelect()
  - rangeSelect()
  - clear()
  ---
  ## 🛠 useFileOperations
  - rename()
  - delete()
  - copy()
  - move()
  - createFile()
  - createFolder()
  ---
  ## 👁 useDirectoryWatcher
  - sync auto quand fichiers changent
  - évite bouton refresh inutile
  ---
  # ⚡ 6. Performance (clé pour UX fluide)
  ## 🚀 Obligatoire
  - Virtualisation (🔥 énorme gain)
    - `react-virtual`
  - Debounce search (300ms)
  - Cache fichiers
  ---
  ## 🧠 Cache Strategy
  ```text
  LRU Cache (par path)
  TTL: 5-10 secondes

  ```
  ---
  ## 📦 Lazy loading
  - preview uniquement quand sélection
  - icônes chargées async
  ---
  # 🎯 7. UX avancée (ce qui fait la diff)
  ## 🖱 Interactions
  - Drag & Drop (move files)
  - Rename inline (F2)
  - Delete → confirmation + undo (🔥)
  - Double-click intelligent
  ---
  ## ⌨️ Shortcuts
  ```text
  Ctrl + C → copy
  Ctrl + V → paste
  Ctrl + X → cut
  Del → delete
  F2 → rename
  Ctrl + A → select all

  ```
  ---
  ## 🧠 Smart features
  - ouverture par défaut selon extension
  - historique persistant (localStorage)
  - favoris personnalisés
  ---
  # 🧩 8. Preview Engine (extensible)
  ```ts
  const previewRegistry = {
    'text/plain': TextPreview,
    'image/png': ImagePreview,
  }

  ```
  👉 futur :
  - PDF
  - vidéo
  - audio
  ---
  # 🔐 9. Sécurité (souvent oublié ⚠️)
  - sandbox paths (no access root critique)
  - validation côté main process
  - sanitize paths
  - limiter taille fichiers preview (<100KB ok)
  ---
  # 🎨 10. UI / Design System
  - glassmorphism OK mais :  
  👉 ajoute :
  - états hover/active ultra clairs
  - skeleton loaders
  - transitions ultra fluides (framer-motion)
  ---
  # 🧪 11. Tests (niveau pro)
  ## Unit
  - hooks
  - services
  ## Integration
  - navigation
  - file ops
  ## E2E
  - ouvrir dossier
  - supprimer fichier
  ---
  # 🚀 12. Roadmap réaliste (par étapes)
  ## Phase 1 (MVP propre)
  - navigation
  - affichage fichiers
  - sélection
  - open dossier
  ---
  ## Phase 2
  - CRUD (rename, delete, create)
  - context menu
  - preview simple
  ---
  ## Phase 3
  - search
  - tri
  - vues multiples
  ---
  ## Phase 4
  - watcher temps réel
  - drag & drop
  ---
  ## Phase 5 (🔥 avancé)
  - multi-tabs
  - cloud (Google Drive, etc.)
  - remote FS (SSH)
  ---
  # 🧠 13. Intégration SkyOS (vision future)
  Ton explorer devient :
  ```text
  FileSystem API central
  → utilisé par toutes les apps

  ```
  👉 ex :
  - Elite → envoie fichiers
  - générateur doc → lit repos
  - desktop → drag files
  ---
  # ⚡ 14. Fix immédiat (TS)
  Ton fix est bon mais version propre :
  ```ts
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  ```
  ---
  # 💡 15. Upgrade ultime (vision futuriste)
  👉 transforme ton explorer en :
  ## 🧠 "Smart Explorer"
  - recherche IA ("mes fichiers récents importants")
  - tags automatiques
  - preview enrichie
  - résumé fichiers texte
  ---
  # 🏁 Conclusion
  Ton plan initial = très bon  
  👉 mais maintenant tu as :
  - une **archi modulaire**
  - une **logique scalable**
  - une **vision OS-level**
  - une **roadmap claire**  
