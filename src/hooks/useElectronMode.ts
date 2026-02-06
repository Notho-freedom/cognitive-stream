import { useState, useEffect } from 'react';

/**
 * Détecte si l'app tourne dans Electron et configure le mode desktop widgets.
 * Rend le body transparent et expose les APIs widget.
 */
export function useElectronMode() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const bridge = (window as any).cognitiveBridge;
    if (bridge?.isElectron) {
      setIsElectron(true);
      // Rendre le body transparent pour le mode widgets
      document.documentElement.classList.add('electron-mode');
      document.body.style.background = 'transparent';
    }

    return () => {
      document.documentElement.classList.remove('electron-mode');
    };
  }, []);

  const setMousePassthrough = (enable: boolean) => {
    const bridge = (window as any).cognitiveBridge;
    if (bridge?.widgetMouseEnter && bridge?.widgetMouseLeave) {
      if (enable) {
        bridge.widgetMouseLeave();
      } else {
        bridge.widgetMouseEnter();
      }
    }
  };

  return { isElectron, setMousePassthrough };
}
