import { FileType } from '@/types/fileExplorer';
import { HDIcon } from './icons/HDIcon';
import { resolveIconUrl, locationIcons } from './icons/iconRegistry';

interface FileIconProps {
  type: FileType;
  extension?: string;
  name?: string;
  size?: number;
  className?: string;
}

const fallbackEmoji: Record<FileType, string> = {
  folder: '📁', image: '🖼️', document: '📄', video: '🎬', audio: '🎵',
  code: '💻', archive: '📦', executable: '⚙️', text: '📝', pdf: '📕',
  spreadsheet: '📊', presentation: '📰', font: '🔤', database: '🗄️', unknown: '📎',
};

export function FileIcon({ type, extension, name, size = 24, className = '' }: FileIconProps) {
  const url = resolveIconUrl({ type, extension, name });
  return (
    <HDIcon
      src={url}
      size={size}
      alt={type}
      className={className}
      fallbackEmoji={fallbackEmoji[type] || '📎'}
    />
  );
}

// HD location icons — use throughout sidebar / drive overview
export const sidebarIcons = {
  thisPC: locationIcons.thisPC,
  driveSystem: locationIcons.driveSystem,
  driveData: locationIcons.driveData,
  driveBackup: locationIcons.driveBackup,
  usb: locationIcons.usb,
  googleDrive: locationIcons.googleDrive,
  oneDrive: locationIcons.oneDrive,
  dropbox: locationIcons.dropbox,
  cloud: locationIcons.cloud,
  nas: locationIcons.nas,
  ftp: locationIcons.ftp,
  network: locationIcons.network,
  phone: locationIcons.phone,
  trashEmpty: locationIcons.trashEmpty,
  trashFull: locationIcons.trashFull,
  folder: locationIcons.folder,
  desktop: locationIcons.desktop,
  downloads: locationIcons.downloads,
  documents: locationIcons.documents,
  pictures: locationIcons.pictures,
  music: locationIcons.music,
  videos: locationIcons.videos,
};

// Backwards-compat: emoji helpers (still used in a few places, kept as fallback)
export const sidebarEmojis = {
  thisPC: '🖥️', drive: '💾', usb: '🔌', cloud: '☁️', network: '🌐',
  trash: '🗑️', phone: '📱', folder: '📂', home: '🏠',
};
