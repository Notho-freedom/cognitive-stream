import { useCallback, useState } from 'react';

interface NavHistory {
  back: string[];
  forward: string[];
  current: string;
}

export function useNavigationHistory(initialPath: string) {
  const [history, setHistory] = useState<NavHistory>({
    back: [],
    forward: [],
    current: initialPath,
  });

  const navigate = useCallback((path: string) => {
    setHistory(prev => ({
      back: [...prev.back, prev.current],
      forward: [],
      current: path,
    }));
  }, []);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.back.length === 0) return prev;
      const newBack = [...prev.back];
      const target = newBack.pop()!;
      return {
        back: newBack,
        forward: [prev.current, ...prev.forward],
        current: target,
      };
    });
  }, []);

  const goForward = useCallback(() => {
    setHistory(prev => {
      if (prev.forward.length === 0) return prev;
      const [target, ...rest] = prev.forward;
      return {
        back: [...prev.back, prev.current],
        forward: rest,
        current: target,
      };
    });
  }, []);

  const goUp = useCallback(() => {
    setHistory(prev => {
      const segments = prev.current.replace(/\\/g, '/').split('/').filter(Boolean);
      if (segments.length <= 1) return prev;
      segments.pop();
      const parent = prev.current.startsWith('/') ? '/' + segments.join('/') : segments.join('\\');
      return {
        back: [...prev.back, prev.current],
        forward: [],
        current: parent,
      };
    });
  }, []);

  return {
    currentPath: history.current,
    canGoBack: history.back.length > 0,
    canGoForward: history.forward.length > 0,
    navigate,
    goBack,
    goForward,
    goUp,
  };
}
