
# Plan: Stabilisation Electron + Continuation Bureau

## Phase 1 -- Fix Electron crash on click (critical)

**Root causes identified:**

1. **`vite.config.ts` missing `base: './'`** -- In production mode (`loadFile`), Vite generates absolute paths (`/assets/...`) that resolve to filesystem root under `file://` protocol, causing a blank/broken page. Any interaction triggers errors in a half-loaded app.

2. **`explorerShell.recoverOnStartup()` and `armTakeover()` call `runPowerShell` synchronously on non-Windows** -- These calls use `execFileSync('powershell.exe', ...)` which throws immediately on Linux/macOS, crashing `bootstrapApp()` before the window even loads. Guard all PowerShell calls with `process.platform === 'win32'`.

3. **Unhandled renderer errors** -- Several components access `window.cognitiveBridge` methods (like `exec`, `listDir`) without proper error boundaries. If any bridge call throws (e.g., missing IPC handler), the whole React tree unmounts.

**Fixes:**
- Add `base: './'` to `vite.config.ts`
- Wrap `bootstrapApp()` platform-specific code with `process.platform === 'win32'` guards
- Add a top-level React `ErrorBoundary` around `DesktopWidgetShellInner` to catch and display errors instead of crashing
- Guard `useDesktopIcons` and `useSystemBridge` calls to gracefully handle missing bridge methods

## Phase 2 -- Wallpaper & icon scale regressions

- **Wallpaper custom image**: Verify `getWallpaperBackground` correctly applies the `custom` preset URL; confirm the `DesktopBackground` component passes it through to the `style.background` prop
- **Ctrl+Scroll icon scale**: Verify `useIconScale` hook is registered in `DesktopWidgetShellInner` (already present at line 64) and that the event listener actually calls `update('iconScale', ...)` on the settings context

## Phase 3 -- Desktop completion (features)

**3a. Taskbar improvements:**
- Add system tray area (clock, volume indicator, network indicator)
- Add window previews on hover over taskbar items
- Animate window minimize/restore from taskbar position

**3b. Window management:**
- Window snapping (drag to screen edges for half/quarter layout)
- Snap indicators (visual guides when dragging near edges)
- Alt+Tab window switcher overlay
- Proper minimize animation (shrink to taskbar)

**3c. Context menus completion:**
- File-specific context menus (open, rename, delete, properties)
- Taskbar context menu (task manager, settings)
- Icon-specific context menus with real actions (open with, pin to taskbar)

**3d. Settings page completion:**
- Move all configuration from old side panel into Settings page sections
- Add wallpaper browser with file picker (already partially done)
- Add theme/accent color picker with live preview
- Add taskbar position/behavior settings
- Add display/resolution information section

**3e. Desktop ambient & polish:**
- Selection rectangle for multi-select on desktop (already exists, verify wiring)
- Right-click "New folder" and "New file" actually create items
- Sort icons by name/size/date
- Desktop icon label editing (slow double-click to rename)

## Files to modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Add `base: './'` |
| `electron/main.js` | Platform guards around PowerShell/shell-integration code |
| `src/components/desktop/DesktopWidgetShell.tsx` | Add ErrorBoundary wrapper |
| `src/components/desktop/DesktopTaskbar.tsx` | System tray, window previews |
| `src/components/desktop/CogWindow.tsx` | Snap-to-edge, minimize animation |
| `src/components/desktop/DesktopIconsLayer.tsx` | Context menus, rename, sort |
| `src/components/desktop/CogContextMenu.tsx` | File-specific menu items |
| `src/pages/Settings.tsx` | Complete all sections |
| `src/hooks/useIconScale.ts` | Verify integration |
| `src/hooks/useDesktopIcons.ts` | Guard bridge calls |

## New files

| File | Purpose |
|------|---------|
| `src/components/desktop/ErrorBoundary.tsx` | Catch-all error boundary for desktop shell |
| `src/components/desktop/WindowSwitcher.tsx` | Alt+Tab overlay |
| `src/components/desktop/SystemTray.tsx` | Clock, indicators in taskbar |
