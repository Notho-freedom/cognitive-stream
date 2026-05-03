
# Plan: Integrate New Explorer + Redesign Desktop with Explorer Design Language

## Overview

The new `FileExplorer` component is already in the project but not wired into the desktop shell. This plan connects it as a proper CogWindow, extracts its visual language (dark surfaces, `explorer-surface`/`explorer-hover` CSS vars, glassmorphic toolbar/statusbar, sound effects) to rebuild the desktop chrome, and adds a standalone terminal window.

---

## Phase 1 -- Connect Explorer to Desktop Shell

**Goal**: Open the explorer as a CogWindow from taskbar, context menu, and desktop icon double-click.

1. In `DesktopWidgetShell`, add a handler `openExplorer(path?)` that calls `cogWindows.open('explorer', 'EXPLORATEUR', { size: { width: 1000, height: 700 } })`.
2. In the CogWindows render section, when `win.type === 'explorer'`, render `<FileExplorer embeddedMode="cognitive-stream" onClose={() => cogWindows.close(win.id)} className="h-full" />`.
3. Wire desktop icon double-click (`onOpenFolder`) to `openExplorer(path)`.
4. Add "Explorateur" to the radial menu items and the desktop context menu.
5. Re-add the `open explorer` desktop command in `DesktopCommandBar`.

## Phase 2 -- Standalone Terminal Window

**Goal**: Extract `TerminalPanel` from the explorer and make it openable as its own CogWindow.

1. Create `src/components/desktop/TerminalWindow.tsx` -- a wrapper that renders `TerminalPanel` with a default `cwd` of `'root'` and `cwdName` of `'C:\\'`, passing `onClose` to close the CogWindow.
2. In `DesktopWidgetShell`, when `win.type === 'terminal'`, render `<TerminalWindow onClose={...} />`.
3. Add "Terminal" option in the radial menu, context menu, and `Ctrl+`` shortcut to open it.

## Phase 3 -- Desktop Redesign with Explorer Design Language

**Goal**: Rebuild the desktop taskbar, context menus, and window frames using the explorer's visual system (dark `hsl(220 24% 3%)` surfaces, `border-border/40`, `font-light text-[12px]`, explorer CSS variables, sound feedback).

### 3a. Taskbar Redesign
- Restyle `DesktopTaskbar` to match the explorer's `TabBar`/`StatusBar` aesthetic: `bg-[hsl(220_24%_3%)]` base, `border-border/40`, same `text-[12px] font-light` typography.
- Replace the SVG diamond start button with an icon consistent with explorer iconography.
- Add sound feedback (`play('click')`, `playHover`) from the shared sound system on all taskbar interactions.
- Show the system tray area (clock, brain status, bridge status) in the same `StatusBar` style as the explorer's bottom bar.

### 3b. Window Frames (CogWindow + WindowFrame)
- Update `CogWindow` and `WindowFrame` title bars to match the explorer's `TabBar` style: same background color, same minimize/maximize/close button styling (including red hover on close).
- Use `hsl(var(--explorer-surface))` for window surfaces and `hsl(var(--explorer-hover))` for hover states.

### 3c. Context Menus
- Restyle `CogContextMenu` to use the explorer's `glass-menu` class and `text-[12px] font-light` styling with `hsl(var(--explorer-hover))` on hover.

### 3d. Desktop Icons
- Apply `font-light text-[11px]` to icon labels.
- Add `playHover` on icon hover and `play('dblclick')` on double-click, using the shared sound engine.

### 3e. Command Bar
- Harmonize `DesktopCommandBar` visual treatment with the explorer surface/hover variables for consistency.

## Phase 4 -- Sound Integration

**Goal**: Ensure the desktop shell uses the same sound engine as the explorer.

- Import `useSound` in components that currently use `useSoundEffects` where appropriate, or ensure `useSoundEffects` delegates to the same `@/lib/sounds` engine.
- Add `play('open')` when opening a CogWindow, `play('close')` when closing, `play('click')` for taskbar buttons.

---

## Files to Create
- `src/components/desktop/TerminalWindow.tsx`

## Files to Modify
- `src/components/desktop/DesktopWidgetShell.tsx` (explorer + terminal window types, openExplorer handler)
- `src/components/desktop/DesktopTaskbar.tsx` (visual redesign)
- `src/components/desktop/CogWindow.tsx` (title bar restyle)
- `src/components/desktop/WindowFrame.tsx` (title bar restyle)
- `src/components/desktop/CogContextMenu.tsx` (glass-menu styling)
- `src/components/desktop/DesktopIconsLayer.tsx` (sound + typography)
- `src/components/desktop/DesktopCommandBar.tsx` (visual harmonization)

## Result
1. Explorer opens in a draggable/resizable CogWindow from multiple entry points
2. Terminal opens as standalone window
3. Entire desktop uses the explorer's modern-futuristic aesthetic consistently
4. Sound feedback everywhere (click, hover, open, close)
5. Cohesive design language across all surfaces
