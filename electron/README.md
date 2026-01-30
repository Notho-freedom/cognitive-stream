# Cognitive HUD - Electron Setup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    IPC Handlers                          │ │
│  │  • system:exec    → Execute shell commands               │ │
│  │  • system:spawn   → Long-running processes + streaming   │ │
│  │  • fs:read/write  → File operations                      │ │
│  │  • fs:list        → Directory listing                    │ │
│  │  • system:info    → System information                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                     contextBridge
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              window.cognitiveBridge                      │ │
│  │  • exec(command)     • readFile(path)                    │ │
│  │  • spawn(cmd, args)  • writeFile(path, content)          │ │
│  │  • onOutput(cb)      • listDir(path)                     │ │
│  │  • getSystemInfo()   • exists(path) / delete(path)       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│                     useSystemBridge()                        │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 React Application                        │ │
│  │   CognitiveInterface ←→ useCognitiveChat                 │ │
│  │   AI Response parsing → System Action Execution          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Installation Locale

### Prérequis
- Node.js 18+
- npm ou pnpm

### Étapes

1. **Cloner le projet**
```bash
git clone <your-repo>
cd <project>
```

2. **Installer les dépendances du frontend**
```bash
npm install
```

3. **Installer les dépendances Electron**
```bash
cd electron
npm install
cd ..
```

4. **Lancer en mode développement**

Terminal 1 - Vite dev server:
```bash
npm run dev
```

Terminal 2 - Electron:
```bash
cd electron
npm start
```

## Commandes Système

L'IA peut exécuter des commandes système via des blocs de code spéciaux:

### Exécuter une commande
```system:exec
ls -la ~/Documents
```

### Lire un fichier
```system:read
~/.bashrc
```

### Écrire un fichier
```system:write:~/test.txt
Hello World!
```

### Lister un répertoire
```system:list
~/Projects
```

## Sécurité

⚠️ **Important**: Le bridge système a un accès complet au système de fichiers et peut exécuter n'importe quelle commande. Utilisez uniquement avec des sources de confiance.

### Recommandations
- Ne jamais exécuter de commandes provenant de sources non fiables
- Ajouter une whitelist de commandes autorisées si nécessaire
- Implémenter une confirmation utilisateur pour les commandes dangereuses

## API du Bridge

### `cognitiveBridge.exec(command, options?)`
Exécute une commande shell et retourne le résultat.

### `cognitiveBridge.spawn(command, args?, options?)`
Lance un processus avec streaming de sortie.

### `cognitiveBridge.readFile(path)`
Lit le contenu d'un fichier.

### `cognitiveBridge.writeFile(path, content)`
Écrit du contenu dans un fichier.

### `cognitiveBridge.listDir(path, options?)`
Liste le contenu d'un répertoire.

### `cognitiveBridge.getSystemInfo()`
Retourne les informations système (OS, mémoire, CPU, etc.)
