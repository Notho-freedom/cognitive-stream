import { useEffect } from 'react';
import { DesktopWidgetShell } from '@/components/desktop/DesktopWidgetShell';

/**
 * Web preview of the immersive desktop.
 * Uses mock data (no Electron bridge required) so we can test taskbar,
 * icons, windows, explorer, terminal, context menus, etc.
 */
export default function DesktopPage() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('desktop-preview-mode');
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('desktop-preview-mode');
    };
  }, []);

  return <DesktopWidgetShell />;
}
