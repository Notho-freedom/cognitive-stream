import { HDIcon } from './icons/HDIcon';
import { FileIcon, sidebarIcons } from './FileIcon';
import { fileSystem } from '@/data/mockFileSystem';
import { useI18n } from '@/i18n/LanguageContext';
import { Battery, Smartphone, Wifi, Power as Eject } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onNavigate: (id: string) => void;
}

const internalRootId = 'mobile-internal';
const sdRootId = 'mobile-sd';

export function MobileDeviceView({ onNavigate }: Props) {
  const { t } = useI18n();
  const internal = fileSystem[internalRootId];
  const sd = fileSystem[sdRootId];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header card */}
      <div className="p-6 border-b border-border/40 bg-[hsl(var(--muted))]/30">
        <div className="flex items-center gap-5">
          <HDIcon src={sidebarIcons.phone} size={88} alt="Redmi A2+" fallbackEmoji="📱" />
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-light tracking-wide">Redmi A2+</h1>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">MTP · Xiaomi · Android 13 · 64 Go</p>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Wifi size={12} className="text-emerald-400" /> {t('mobile.connected')}</span>
              <span className="flex items-center gap-1.5"><Battery size={12} className="text-emerald-400" /> 78%</span>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground">
                <Eject size={11} /> {t('mobile.safeEject')}
              </Button>
            </div>
            {/* Storage bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-light">
                <span>{t('mobile.storage')}</span>
                <span className="font-mono">42.3 / 64 Go</span>
              </div>
              <div className="h-[5px] rounded-full bg-background overflow-hidden">
                <div className="h-full bg-primary/60" style={{ width: '66%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal storage */}
      <div className="p-6">
        <h2 className="section-label mb-3">{t('mobile.internal')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {(internal?.children || []).map(id => {
            const f = fileSystem[id];
            if (!f) return null;
            return (
              <div
                key={id}
                onClick={() => onNavigate(id)}
                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
              >
                <FileIcon type="folder" name={f.name} size={32} />
                <div className="min-w-0">
                  <p className="text-[12px] font-light truncate">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(f.children?.length || 0)} {t('status.items_plural')}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* SD card */}
        {sd && (
          <>
            <h2 className="section-label mb-3">{t('mobile.sdcard')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {(sd.children || []).map(id => {
                const f = fileSystem[id];
                if (!f) return null;
                return (
                  <div
                    key={id}
                    onClick={() => onNavigate(id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
                  >
                    <FileIcon type="folder" name={f.name} size={32} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-light truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(f.children?.length || 0)} {t('status.items_plural')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
