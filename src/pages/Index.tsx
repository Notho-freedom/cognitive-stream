import { 
  NotificationProvider, 
  NotificationQueue, 
  CognitiveInterface,
} from '@/components/cognitive';

export default function Index() {
  return (
    <NotificationProvider>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Minimal ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-intent-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-intent-secondary/3 rounded-full blur-[100px]" />
        </div>

        {/* Notification Queue GX */}
        <NotificationQueue position="top-right" />

        {/* Pure Cognitive Interface */}
        <div className="relative z-10 w-full">
          <CognitiveInterface />
        </div>
      </div>
    </NotificationProvider>
  );
}
