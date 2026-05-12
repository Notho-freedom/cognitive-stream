## Objectif
Remplacer l’approche actuelle trop “GX/radiale” par un vrai desktop inspiré Kali Linux/XFCE : panneau supérieur sobre, menu applications vertical, bureau stable avec icônes, fenêtres classiques, et intégration propre des composants existants sans double chrome ni comportements parasites.

## Ce qui sera corrigé
- Supprimer le menu radial qui s’ouvre actuellement depuis “Démarrer” et le remplacer par un menu Kali/XFCE classique.
- Éviter les fenêtres imbriquées : l’explorateur garde ses onglets, toolbar, navigation et status bar internes ; la fenêtre desktop ne fournit que le cadre OS.
- Même principe pour le terminal : une vraie fenêtre terminal desktop, sans header terminal contradictoire ou bouton de fermeture dupliqué.
- Stabiliser les clics : les interactions du menu, des icônes, des fenêtres et des context menus ne doivent plus masquer tout le contenu ou déclencher des couches inattendues.
- Garder la route `/desktop` utilisable en web preview avec données fictives quand le pont Electron n’est pas disponible.

## Plan d’implémentation
1. **Shell desktop Kali**
   - Transformer `DesktopTaskbar` en panneau supérieur type Kali/XFCE : bouton dragon/applications à gauche, lanceurs rapides, boutons de fenêtres, workspaces, tray à droite.
   - Remplacer `StartRadialMenu` par un composant `KaliStartMenu` en panneau vertical : favoris, catégories, recherche simple, actions système.
   - Retirer les effets radiaux et les ouvertures incohérentes.

2. **Fenêtres desktop classiques**
   - Adapter `CogWindow` en cadre de fenêtre sobre : barre de titre fine, contrôles minimize/maximize/close, drag, focus, snap, z-index.
   - Ajouter un mode `chromeVariant` ou équivalent pour éviter que les apps intégrées recréent leur propre fenêtre.
   - Conserver uniquement le chrome OS externe dans le desktop ; les composants internes conservent leurs propres barres fonctionnelles.

3. **Explorateur parfaitement intégré**
   - Monter `FileExplorer` en mode embedded strict : pas de `WindowFrame` interne, pas de position fixed interne.
   - Garder son `TabBar`, `Toolbar`, sidebar, grille, preview, terminal intégré, status bar.
   - Passer le chemin demandé depuis les icônes desktop (`mock:documents`, dossiers réels, etc.) vers `initialPath/openToken` pour ouvrir le bon emplacement.

4. **Terminal parfaitement intégré**
   - Remplacer le wrapper actuel par une fenêtre terminal pleine hauteur.
   - Le terminal ne doit plus afficher de mini-barre avec fermeture/réduction interne quand il est dans une fenêtre desktop.
   - Ajouter un mode d’affichage terminal desktop, style Kali terminal : prompt Linux-like, fond sombre, contenu scrollable pleine fenêtre.

5. **Icônes et actions desktop**
   - Mapper les icônes mock correctement : Explorateur ouvre l’explorateur, Terminal ouvre le terminal, Paramètres ouvre settings, dossiers ouvrent l’explorateur au bon chemin.
   - Corriger les `.lnk` mock qui aujourd’hui peuvent tenter un `xdg-open` inutile en web preview.
   - Garder le drag/select/context menu, mais sans déclencher le menu global quand on clique sur une icône ou une fenêtre.

6. **Stabilité et validation**
   - Renforcer les garde-fous contre les objets `null` dans la gestion fenêtres/menu/tabs.
   - Vérifier `/desktop` dans la preview : clic menu, ouverture explorateur, ouverture terminal, focus/minimize/maximize/close, double-clic icônes.
   - Inspecter les logs console pour confirmer l’absence du crash `Cannot read properties of null (reading 'id')`.

## Contraintes gardées
- Pas de backend.
- Pas de modification des fichiers générés Cloud.
- Design sombre, sobre, desktop Kali/XFCE, mais compatible avec les tokens existants du projet.
- Les composants existants restent réutilisés ; on corrige leur intégration au lieu de les dupliquer inutilement.