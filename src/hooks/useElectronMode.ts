import { useState, useEffect } from 'react';

/**
 * Détecte si l'app tourne dans Electron.
 * N'applique plus de transparence — le bureau immersif garde le même fond que le web.
 */
export function useElectronMode() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const bridge = (window as any).cognitiveBridge;
    if (bridge?.isElectron) {
      setIsElectron(true);
      document.documentElement.classList.add('electron-mode');
    }

    return () => {
      document.documentElement.classList.remove('electron-mode');
    };
  }, []);

  return { isElectron };
}
