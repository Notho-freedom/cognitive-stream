

# Fix: Missing state variables in DesktopWidgetShell

The build errors are straightforward — the component references `explorerTakeoverEnabled`, `explorerTakeoverState`, `setExplorerTakeoverEnabled`, and `setExplorerTakeoverState` but never declares them as state.

## Change

In `src/components/desktop/DesktopWidgetShell.tsx`, add two `useState` declarations after the existing explorer state variables (around line 56):

```ts
const [explorerTakeoverEnabled, setExplorerTakeoverEnabled] = useState(false);
const [explorerTakeoverState, setExplorerTakeoverState] = useState<string>('inactive');
```

This restores the missing state that lines 227-228, 241-245, 348-355 depend on.

No other files need changes for this fix.

