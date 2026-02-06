import { useState } from 'react';
import { 
  NotificationProvider, 
  NotificationQueue, 
  CognitiveInterface,
  LoadingScreen,
} from '@/components/cognitive';
import { CogStatusBridge } from '@/components/cognitive/CogStatusBridge';
import { DesktopWidgetShell } from '@/components/desktop/DesktopWidgetShell';
import { useElectronMode } from '@/hooks/useElectronMode';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const { isElectron } = useElectronMode();

  // En mode Electron → widgets de bureau, pas de loading screen traditionnelle
  if (isElectron) {
    return <DesktopWidgetShell />;
  }

  // Mode web classique
  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* Minimal ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
        </div>

        {/* Notification Queue GX */}
        <NotificationQueue position="top-right" />

        {/* GX Status Bridge - Top */}
        <div className="relative z-20 mb-6">
          <CogStatusBridge className="inline-block" />
        </div>

        {/* Pure Cognitive Interface - Centered */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <CognitiveInterface />
        </div>
      </div>
    </NotificationProvider>
  );
}
