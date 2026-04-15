const { app, BrowserWindow, ipcMain, screen, webContents } = require('electron');
const path = require('path');
const { spawn, exec, execFile, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { createExplorerService } = require('./explorer-service');
const { createExplorerShellManager } = require('./explorer-shell');
let systemInfoProvider = null;

try {
  // Optional dependency for richer metrics
  systemInfoProvider = require('systeminformation');
} catch (error) {
  console.warn('[SystemMetrics] Optional dependency "systeminformation" not available');
}

let lastCpuSample = null;
let gpuInfoCache = null;
let gpuInfoCacheTimestamp = 0;
let fullMetricsCache = {
  timestamp: 0,
  disk: [],
  network: [],
  temperature: {},
};

const FULL_METRICS_TTL = 8000;
const GPU_METRICS_TTL = 30000;
const SHELL_OPEN_FLAG = '--shell-open';
const SHELL_OPEN_HOME_FLAG = '--shell-open-home';
const LEGACY_WINDOWS_EXPLORER_CLSID = '{52205fd8-5dfb-447d-801a-d0b52f2e83e1}';
const EXPLORER_INTEGRATION_VERSION = 3;
const EXPLORER_SHELL_OWNER = 'cognitive-stream';
const DIR_CACHE_TTL_MS = 5000;
const THIS_PC_CACHE_TTL_MS = 15000;
const NETWORK_CACHE_TTL_MS = 30000;
const ICON_PATH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ICON_EXTENSION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const POWERSHELL_TIMEOUT_MS = 2500;
const EXPLORER_SETTINGS_DEFAULTS = {
  explorerIntegrationEnabled: true,
  explorerIntegrationMode: 'global',
};

let explorerSettingsPath = null;
let shellLauncherScriptPath = null;
let shellLauncherStatePath = null;
let explorerCacheRootPath = null;
let explorerShellBackupPath = null;
let rendererExplorerChannelReady = false;
const pendingExplorerOpenRequests = [];
const systemIconCache = new Map();
const extensionIconCache = new Map();
const directoryWatchers = new Map();
const layeredCacheMemory = new Map();
let explorerService = null;
let explorerShell = null;

function getDefaultExplorerPath() {
  return 'virtual:this-pc';
}

function getDirectoryWatcherKey(ownerId, dirPath) {
  return `${ownerId}:${dirPath}`;
}

function stopDirectoryWatcher(watcherKey) {
  const watcherEntry = directoryWatchers.get(watcherKey);
  if (!watcherEntry) return;

  if (watcherEntry.timeout) {
    clearTimeout(watcherEntry.timeout);
  }

  try {
    watcherEntry.watcher.close();
  } catch (error) {
    console.warn('[FSWatch] Failed to close watcher', error);
  }

  directoryWatchers.delete(watcherKey);
}

function stopDirectoryWatchersForOwner(ownerId) {
  for (const [watcherKey, watcherEntry] of directoryWatchers.entries()) {
    if (watcherEntry.ownerId === ownerId) {
      stopDirectoryWatcher(watcherKey);
    }
  }
}

function emitDirectoryWatchEvent(ownerId, payload) {
  const ownerContents = webContents.fromId(ownerId);
  if (ownerContents && !ownerContents.isDestroyed()) {
    ownerContents.send('fs:watch-event', payload);
  }
}

function getExplorerSettingsDefaults() {
  return {
    ...EXPLORER_SETTINGS_DEFAULTS,
  };
}

function parseShellLaunchArgs(argv = []) {
  const shellOpenIndex = argv.indexOf(SHELL_OPEN_FLAG);
  if (shellOpenIndex >= 0) {
    return {
      isShellRequest: true,
      targetPath: argv[shellOpenIndex + 1] || null,
      source: 'folder',
    };
  }

  if (argv.includes(SHELL_OPEN_HOME_FLAG)) {
    return {
      isShellRequest: true,
      targetPath: null,
      source: 'hotkey',
    };
  }

  return {
    isShellRequest: false,
    targetPath: null,
    source: null,
  };
}

const initialShellLaunch = parseShellLaunchArgs(process.argv);
const hasSingleInstanceLock = app.requestSingleInstanceLock({
  shellLaunch: initialShellLaunch,
});

if (!hasSingleInstanceLock) {
  app.quit();
}

function escapePowerShellString(value) {
  return value.replace(/'/g, "''");
}

function resolveWindowsShortcut(filePath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, path: filePath, error: 'Not supported' });
      return;
    }
    const escapedPath = escapePowerShellString(filePath);
    const command = [
      '$s = (New-Object -ComObject WScript.Shell).CreateShortcut(\'',
      escapedPath,
      '\');',
      '$obj = [PSCustomObject]@{',
      'TargetPath = $s.TargetPath;',
      'IconLocation = $s.IconLocation;',
      'Arguments = $s.Arguments;',
      'WorkingDirectory = $s.WorkingDirectory;',
      '};',
      '$obj | ConvertTo-Json -Compress'
    ].join('');

    exec(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${command}"`, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve({
          success: false,
          path: filePath,
          error: error?.message || stderr?.toString(),
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout.toString().trim());
        resolve({
          success: true,
          path: filePath,
          targetPath: parsed.TargetPath || null,
          iconLocation: parsed.IconLocation || null,
          arguments: parsed.Arguments || null,
          workingDirectory: parsed.WorkingDirectory || null,
        });
      } catch (parseError) {
        resolve({
          success: false,
          path: filePath,
          error: parseError instanceof Error ? parseError.message : 'Parse error',
        });
      }
    });
  });
}

// Keep a global reference of the window object
let mainWindow;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function runPowerShell(script, options = {}) {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      encoding: 'utf8',
      windowsHide: true,
      ...options,
    }
  );
}

function runPowerShellAsync(script, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: options.timeout ?? POWERSHELL_TIMEOUT_MS,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        if (stderr && stderr.trim()) {
          reject(new Error(stderr.trim()));
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function ensureDirectory(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashCacheKey(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function getExplorerCacheFilePath(cacheKey) {
  if (!explorerCacheRootPath) return null;
  return path.join(explorerCacheRootPath, `${hashCacheKey(cacheKey)}.json`);
}

function getLayeredCacheEntry(cacheKey) {
  return layeredCacheMemory.get(cacheKey) || null;
}

function setLayeredCacheEntry(cacheKey, entry) {
  layeredCacheMemory.set(cacheKey, entry);
}

function deleteLayeredCacheEntry(cacheKey) {
  layeredCacheMemory.delete(cacheKey);
}

function normalizePathArgument(targetPath) {
  if (!targetPath) return null;
  return targetPath.replace(/^"(.*)"$/, '$1').trim();
}

function openWithWindowsExplorer(targetPath) {
  const normalizedTarget = normalizePathArgument(targetPath);
  const args = normalizedTarget ? [normalizedTarget] : [];
  const child = spawn('explorer.exe', args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.showInactive?.();
  mainWindow.focus();
}

function enqueueExplorerOpen(targetPath, source = 'shell') {
  const nextPath = normalizePathArgument(targetPath) || getDefaultExplorerPath();
  pendingExplorerOpenRequests.push({
    path: nextPath,
    source,
    timestamp: Date.now(),
  });
  flushExplorerOpenQueue();
}

function flushExplorerOpenQueue() {
  if (!mainWindow || !rendererExplorerChannelReady || pendingExplorerOpenRequests.length === 0) {
    return;
  }

  while (pendingExplorerOpenRequests.length > 0) {
    const payload = pendingExplorerOpenRequests.shift();
    mainWindow.webContents.send('explorer:open-request', payload);
  }
}

function setRegistryValue(key, valueName, value, type = 'String') {
  const registryPath = `Registry::${key}`;
  const propertyName = valueName === '(default)' ? '(default)' : valueName;
  const script = `
$path = '${escapePowerShellString(registryPath)}'
New-Item -Path $path -Force | Out-Null
New-ItemProperty -LiteralPath $path -Name '${escapePowerShellString(propertyName)}' -Value '${escapePowerShellString(String(value))}' -PropertyType ${type} -Force | Out-Null
`;

  runPowerShell(script);
}

function removeRegistryValue(key, valueName) {
  const registryPath = `Registry::${key}`;
  const propertyName = valueName === '(default)' ? '(default)' : valueName;
  const script = `
$path = '${escapePowerShellString(registryPath)}'
if (Test-Path -LiteralPath $path) {
  try {
    Remove-ItemProperty -LiteralPath $path -Name '${escapePowerShellString(propertyName)}' -ErrorAction Stop
  } catch {}
}
`;

  runPowerShell(script);
}

function removeRegistryKey(key) {
  const registryPath = `Registry::${key}`;
  const script = `
$path = '${escapePowerShellString(registryPath)}'
if (Test-Path -LiteralPath $path) {
  Remove-Item -LiteralPath $path -Recurse -Force
}
`;

  runPowerShell(script);
}

function cleanShellIntegrationArtifacts() {
  const legacyCachePath = path.join(app.getPath('userData'), 'shell-integration-cache.json');
  if (fs.existsSync(legacyCachePath)) {
    try {
      fs.unlinkSync(legacyCachePath);
    } catch (error) {
      console.warn('[ShellIntegration] Failed to remove legacy cache', error);
    }
  }
}

function refreshWindowsShellAssociations() {
  const script = `
$signature = @"
using System;
using System.Runtime.InteropServices;
public static class Shell32 {
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
Add-Type -TypeDefinition $signature -ErrorAction SilentlyContinue | Out-Null
[Shell32]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
`;

  runPowerShell(script);
}

function readJsonFile(filePath, fallbackValue) {
  if (!filePath || !fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn('[ExplorerSettings] Failed to parse JSON file', filePath, error);
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  if (!filePath) return;
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function parseCacheEnvelope(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return null;
  if (!('value' in rawValue) || typeof rawValue.savedAt !== 'number') return null;
  return rawValue;
}

function isCacheFresh(envelope, ttlMs) {
  if (!envelope) return false;
  return Date.now() - envelope.savedAt <= ttlMs;
}

function getCacheResultFromEnvelope(envelope, source, status = 'ready') {
  if (!envelope) return null;
  return {
    success: true,
    data: envelope.value,
    status,
    source,
    lastUpdatedAt: envelope.savedAt,
  };
}

async function getRedisCacheEnvelope(cacheKey) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', cacheKey]),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const rawValue = typeof payload?.result === 'string' ? payload.result : null;
    if (!rawValue) return null;
    return parseCacheEnvelope(JSON.parse(rawValue));
  } catch (error) {
    return null;
  }
}

async function setRedisCacheEnvelope(cacheKey, envelope, ttlMs) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return;
  }

  try {
    await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', cacheKey, Math.max(1, Math.ceil(ttlMs / 1000)), JSON.stringify(envelope)]),
    });
  } catch (error) {
    // Redis remains best-effort and must never block explorer rendering.
  }
}

async function deleteRedisCacheEnvelope(cacheKey) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return;
  }

  try {
    await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', cacheKey]),
    });
  } catch (error) {
    // Best effort only.
  }
}

async function readLayeredCache(cacheKey, ttlMs) {
  const memoryEntry = parseCacheEnvelope(getLayeredCacheEntry(cacheKey));
  if (isCacheFresh(memoryEntry, ttlMs)) {
    return getCacheResultFromEnvelope(memoryEntry, 'memory');
  }

  const cacheFilePath = getExplorerCacheFilePath(cacheKey);
  const diskEntry = parseCacheEnvelope(readJsonFile(cacheFilePath, null));
  if (isCacheFresh(diskEntry, ttlMs)) {
    setLayeredCacheEntry(cacheKey, diskEntry);
    return getCacheResultFromEnvelope(diskEntry, 'disk');
  }

  const redisEntry = await getRedisCacheEnvelope(cacheKey);
  if (isCacheFresh(redisEntry, ttlMs)) {
    setLayeredCacheEntry(cacheKey, redisEntry);
    if (cacheFilePath) {
      writeJsonFile(cacheFilePath, redisEntry);
    }
    return getCacheResultFromEnvelope(redisEntry, 'redis');
  }

  return null;
}

async function readAnyLayeredCache(cacheKey) {
  const memoryEntry = parseCacheEnvelope(getLayeredCacheEntry(cacheKey));
  if (memoryEntry) {
    return getCacheResultFromEnvelope(memoryEntry, 'memory', 'stale');
  }

  const cacheFilePath = getExplorerCacheFilePath(cacheKey);
  const diskEntry = parseCacheEnvelope(readJsonFile(cacheFilePath, null));
  if (diskEntry) {
    setLayeredCacheEntry(cacheKey, diskEntry);
    return getCacheResultFromEnvelope(diskEntry, 'disk', 'stale');
  }

  const redisEntry = await getRedisCacheEnvelope(cacheKey);
  if (redisEntry) {
    setLayeredCacheEntry(cacheKey, redisEntry);
    if (cacheFilePath) {
      writeJsonFile(cacheFilePath, redisEntry);
    }
    return getCacheResultFromEnvelope(redisEntry, 'redis', 'stale');
  }

  return null;
}

async function writeLayeredCache(cacheKey, ttlMs, value) {
  const envelope = {
    savedAt: Date.now(),
    ttlMs,
    value,
  };

  setLayeredCacheEntry(cacheKey, envelope);

  const cacheFilePath = getExplorerCacheFilePath(cacheKey);
  if (cacheFilePath) {
    writeJsonFile(cacheFilePath, envelope);
  }

  void setRedisCacheEnvelope(cacheKey, envelope, ttlMs);

  return envelope;
}

async function invalidateLayeredCache(cacheKey) {
  deleteLayeredCacheEntry(cacheKey);

  const cacheFilePath = getExplorerCacheFilePath(cacheKey);
  if (cacheFilePath && fs.existsSync(cacheFilePath)) {
    try {
      fs.unlinkSync(cacheFilePath);
    } catch (error) {
      console.warn('[ExplorerCache] Failed to remove disk cache', cacheFilePath, error);
    }
  }

  await deleteRedisCacheEnvelope(cacheKey);
}

function normalizeExplorerSettings(partialSettings) {
  const defaults = getExplorerSettingsDefaults();
  const integrationEnabled = partialSettings?.explorerIntegrationEnabled ?? defaults.explorerIntegrationEnabled;
  const mode = partialSettings?.explorerIntegrationMode === 'folders-only' ? 'folders-only' : 'global';

  return {
    explorerIntegrationEnabled: Boolean(integrationEnabled),
    explorerIntegrationMode: integrationEnabled ? mode : 'folders-only',
  };
}

function loadExplorerSettings() {
  const defaults = getExplorerSettingsDefaults();
  const stored = readJsonFile(explorerSettingsPath, defaults);
  return normalizeExplorerSettings(stored);
}

function saveExplorerSettings(settings) {
  const normalized = normalizeExplorerSettings(settings);
  writeJsonFile(explorerSettingsPath, {
    version: EXPLORER_INTEGRATION_VERSION,
    migrationVersion: EXPLORER_INTEGRATION_VERSION,
    ...normalized,
  });
  return normalized;
}

function writeShellLauncherScript() {
  if (!shellLauncherScriptPath || !shellLauncherStatePath) return;

  const script = `
param(
  [Parameter(Mandatory = $true)][string]$Mode,
  [string]$TargetPath
)

$statePath = '${escapePowerShellString(shellLauncherStatePath)}'

function Open-WindowsExplorer {
  param([string]$FallbackTarget, [string]$FallbackMode)

  if ($FallbackMode -eq 'home' -or [string]::IsNullOrWhiteSpace($FallbackTarget)) {
    Start-Process -FilePath 'explorer.exe' | Out-Null
    exit 0
  }

  Start-Process -FilePath 'explorer.exe' -ArgumentList @($FallbackTarget) | Out-Null
  exit 0
}

if (-not (Test-Path -LiteralPath $statePath)) {
  Open-WindowsExplorer -FallbackTarget $TargetPath -FallbackMode $Mode
}

try {
  $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
} catch {
  Open-WindowsExplorer -FallbackTarget $TargetPath -FallbackMode $Mode
}

if ($null -eq $state -or [string]::IsNullOrWhiteSpace($state.execPath)) {
  Open-WindowsExplorer -FallbackTarget $TargetPath -FallbackMode $Mode
}

$proc = $null
if ($state.pid) {
  $proc = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
}

if ($null -eq $proc) {
  Open-WindowsExplorer -FallbackTarget $TargetPath -FallbackMode $Mode
}

$argumentList = @()
if (-not $state.isPackaged -and -not [string]::IsNullOrWhiteSpace($state.appPath)) {
  $argumentList += $state.appPath
}

if ($Mode -eq 'home') {
  $argumentList += '${SHELL_OPEN_HOME_FLAG}'
} else {
  $argumentList += '${SHELL_OPEN_FLAG}'
  if (-not [string]::IsNullOrWhiteSpace($TargetPath)) {
    $argumentList += $TargetPath
  }
}

try {
  Start-Process -FilePath $state.execPath -ArgumentList $argumentList -WindowStyle Hidden | Out-Null
} catch {
  Open-WindowsExplorer -FallbackTarget $TargetPath -FallbackMode $Mode
}
`;

  ensureDirectory(path.dirname(shellLauncherScriptPath));
  fs.writeFileSync(shellLauncherScriptPath, script.trimStart(), 'utf8');
}

function writeShellLauncherState() {
  if (!shellLauncherStatePath) return;
  writeJsonFile(shellLauncherStatePath, {
    version: EXPLORER_INTEGRATION_VERSION,
    pid: process.pid,
    execPath: process.execPath,
    appPath: app.getAppPath(),
    isPackaged: app.isPackaged,
    updatedAt: Date.now(),
  });
}

function clearShellLauncherState() {
  if (!shellLauncherStatePath || !fs.existsSync(shellLauncherStatePath)) return;
  try {
    fs.unlinkSync(shellLauncherStatePath);
  } catch (error) {
    console.warn('[ShellIntegration] Failed to clear launcher state', error);
  }
}

function parseJsonCommandOutput(rawOutput, fallbackValue = []) {
  const trimmed = rawOutput?.toString().trim();
  if (!trimmed) return fallbackValue;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return parsed ? [parsed] : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function toCacheErrorResult(message, fallbackData = []) {
  return {
    success: false,
    data: fallbackData,
    status: 'error',
    error: message,
  };
}

async function resolveCachedDataset(cacheKey, ttlMs, liveLoader) {
  const freshCache = await readLayeredCache(cacheKey, ttlMs);
  if (freshCache) {
    return freshCache;
  }

  try {
    const liveData = await liveLoader();
    const envelope = await writeLayeredCache(cacheKey, ttlMs, liveData);
    return getCacheResultFromEnvelope(envelope, 'live');
  } catch (error) {
    const staleCache = await readAnyLayeredCache(cacheKey);
    if (staleCache) {
      const status = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('timed out')
        ? 'timeout'
        : 'stale';
      return {
        ...staleCache,
        status,
        error: error instanceof Error ? error.message : 'Unknown cache loader error',
      };
    }

    return toCacheErrorResult(error instanceof Error ? error.message : 'Unknown cache loader error');
  }
}

function getExtensionFromPath(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  return ext || '';
}

function getSystemIconCacheKey(entry) {
  const filePath = entry?.path || '';
  const extension = (entry?.extension || getExtensionFromPath(filePath)).toLowerCase();
  const isDirectory = Boolean(entry?.isDirectory);
  const extCacheable = extension && !isDirectory && !['.exe', '.lnk', '.url', '.appref-ms', '.ico'].includes(extension);

  if (extCacheable) {
    return { scope: 'extension', key: extension };
  }

  return { scope: 'path', key: filePath };
}

async function loadSystemIcon(entry) {
  const originalPath = entry?.path;
  const filePath = originalPath ? resolveTilde(originalPath) : originalPath;
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      success: false,
      path: originalPath || '',
      key: entry?.key || originalPath || '',
      error: 'Path not found',
    };
  }

  const cacheMeta = getSystemIconCacheKey(entry);
  const targetCache = cacheMeta.scope === 'extension' ? extensionIconCache : systemIconCache;
  const ttlMs = cacheMeta.scope === 'extension' ? ICON_EXTENSION_CACHE_TTL_MS : ICON_PATH_CACHE_TTL_MS;
  const layeredKey = cacheMeta.scope === 'extension'
    ? `explorer:icon:ext:${cacheMeta.key}`
    : `explorer:icon:path:${hashCacheKey(cacheMeta.key)}`;

  if (targetCache.has(cacheMeta.key)) {
    return {
      success: true,
      path: originalPath,
      key: entry?.key || originalPath,
      dataUrl: targetCache.get(cacheMeta.key),
      cacheScope: cacheMeta.scope,
    };
  }

  const layeredCache = await readLayeredCache(layeredKey, ttlMs);
  if (layeredCache?.data) {
    targetCache.set(cacheMeta.key, layeredCache.data);
    return {
      success: true,
      path: originalPath,
      key: entry?.key || originalPath,
      dataUrl: layeredCache.data,
      cacheScope: cacheMeta.scope,
    };
  }

  const image = await app.getFileIcon(filePath, { size: 'large' });
  const dataUrl = image.toDataURL();
  targetCache.set(cacheMeta.key, dataUrl);
  await writeLayeredCache(layeredKey, ttlMs, dataUrl);

  return {
    success: true,
    path: originalPath,
    key: entry?.key || originalPath,
    dataUrl,
    cacheScope: cacheMeta.scope,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

function getShellCommandParts(mode, targetPlaceholder) {
  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    `"${shellLauncherScriptPath}"`,
    '-Mode',
    mode,
  ];

  if (targetPlaceholder) {
    args.push('-TargetPath');
    args.push(`"${targetPlaceholder}"`);
  }

  return `powershell.exe ${args.join(' ')}`;
}

function getKnownShellOverrideKeys() {
  return [
    'HKCU\\Software\\Classes\\Drive\\shell\\open\\command',
    'HKCU\\Software\\Classes\\Directory\\shell\\open\\command',
    'HKCU\\Software\\Classes\\Folder\\shell\\open\\command',
    'HKCU\\Software\\Classes\\Folder\\shell\\explore\\command',
    `HKCU\\Software\\Classes\\CLSID\\${LEGACY_WINDOWS_EXPLORER_CLSID}\\shell\\opennewwindow\\command`,
  ];
}

function getShellCommandKeyInfo(key) {
  const registryPath = `Registry::${key}`;
  const script = `
$path = '${escapePowerShellString(registryPath)}'
if (-not (Test-Path -LiteralPath $path)) {
  '{}' 
  exit 0
}
$item = Get-ItemProperty -LiteralPath $path -ErrorAction SilentlyContinue
[PSCustomObject]@{
  command = $item.'(default)'
  delegateExecute = $item.DelegateExecute
  owner = $item.CognitiveStreamOwner
  version = $item.CognitiveStreamVersion
} | ConvertTo-Json -Compress
`;

  try {
    const payload = runPowerShell(script).trim();
    return payload ? JSON.parse(payload) : {};
  } catch (error) {
    return {};
  }
}

function isLegacyShellOverride(shellInfo) {
  const command = String(shellInfo?.command || '');
  return Boolean(
    shellInfo?.delegateExecute !== undefined ||
    command.includes('shell-launcher.ps1') ||
    command.includes(SHELL_OPEN_HOME_FLAG) ||
    command.includes(SHELL_OPEN_FLAG)
  );
}

function clearManagedShellOverrides() {
  let legacyDetected = false;
  const keys = getKnownShellOverrideKeys();

  for (const key of keys) {
    const shellInfo = getShellCommandKeyInfo(key);
    const managedByUs = shellInfo?.owner === EXPLORER_SHELL_OWNER;
    const isLegacy = isLegacyShellOverride(shellInfo);

    if (managedByUs || (includeLegacy && isLegacy)) {
      removeRegistryKey(key);
    }

    legacyDetected = legacyDetected || isLegacy;
  }

  return legacyDetected;
}

function applyWindowsShellIntegration(settings) {
  if (process.platform !== 'win32') return settings;

  const normalized = normalizeExplorerSettings(settings);
  clearManagedShellOverrides();

  if (!normalized.explorerIntegrationEnabled) {
    refreshWindowsShellAssociations();
    return normalized;
  }

  const folderCommand = getShellCommandParts('folder', '%1');
  setRegistryValue('HKCU\\Software\\Classes\\Drive\\shell\\open\\command', '(default)', folderCommand);
  setRegistryValue('HKCU\\Software\\Classes\\Drive\\shell\\open\\command', 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
  setRegistryValue('HKCU\\Software\\Classes\\Drive\\shell\\open\\command', 'CognitiveStreamVersion', EXPLORER_INTEGRATION_VERSION, 'DWord');
  setRegistryValue('HKCU\\Software\\Classes\\Directory\\shell\\open\\command', '(default)', folderCommand);
  setRegistryValue('HKCU\\Software\\Classes\\Directory\\shell\\open\\command', 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
  setRegistryValue('HKCU\\Software\\Classes\\Directory\\shell\\open\\command', 'CognitiveStreamVersion', EXPLORER_INTEGRATION_VERSION, 'DWord');
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\open\\command', '(default)', folderCommand);
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\open\\command', 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\open\\command', 'CognitiveStreamVersion', EXPLORER_INTEGRATION_VERSION, 'DWord');
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\explore\\command', '(default)', folderCommand);
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\explore\\command', 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
  setRegistryValue('HKCU\\Software\\Classes\\Folder\\shell\\explore\\command', 'CognitiveStreamVersion', EXPLORER_INTEGRATION_VERSION, 'DWord');

  if (normalized.explorerIntegrationMode === 'global') {
    const homeCommand = getShellCommandParts('home');
    setRegistryValue(`HKCU\\Software\\Classes\\CLSID\\${LEGACY_WINDOWS_EXPLORER_CLSID}\\shell\\opennewwindow\\command`, '(default)', homeCommand);
    setRegistryValue(`HKCU\\Software\\Classes\\CLSID\\${LEGACY_WINDOWS_EXPLORER_CLSID}\\shell\\opennewwindow\\command`, 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
    setRegistryValue(`HKCU\\Software\\Classes\\CLSID\\${LEGACY_WINDOWS_EXPLORER_CLSID}\\shell\\opennewwindow\\command`, 'CognitiveStreamVersion', EXPLORER_INTEGRATION_VERSION, 'DWord');
  }

  refreshWindowsShellAssociations();
  return normalized;
}

function selfHealWindowsShellIntegration(settings) {
  if (process.platform !== 'win32') {
    return {
      normalized: normalizeExplorerSettings(settings),
      migratedLegacyState: false,
    };
  }
  cleanShellIntegrationArtifacts();
  const legacyDetected = clearManagedShellOverrides();
  const normalized = applyWindowsShellIntegration(settings);
  return {
    normalized,
    migratedLegacyState: legacyDetected,
  };
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    vibrancy: 'ultra-dark',
  });

  // Enable click-through on transparent areas
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080?time=' + new Date().getTime());
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    stopDirectoryWatchersForOwner(mainWindow?.webContents.id);
    rendererExplorerChannelReady = false;
    mainWindow = null;
  });
}

function bootstrapApp() {
  const userDataPath = app.getPath('userData');
  explorerSettingsPath = path.join(userDataPath, 'explorer-settings.json');
  shellLauncherScriptPath = path.join(userDataPath, 'shell-launcher.ps1');
  shellLauncherStatePath = path.join(userDataPath, 'shell-launcher-state.json');
  explorerCacheRootPath = path.join(userDataPath, 'explorer-cache');
  explorerShellBackupPath = path.join(userDataPath, 'explorer-shell-backup.json');

  explorerService = createExplorerService({
    app,
    systemInfoProvider,
    runPowerShellAsync,
  });
  explorerService.setCacheRootPath(explorerCacheRootPath);

  explorerShell = createExplorerShellManager({
    app,
    runPowerShell,
    refreshWindowsShellAssociations,
    shellOpenFlag: SHELL_OPEN_FLAG,
    shellOpenHomeFlag: SHELL_OPEN_HOME_FLAG,
  });
  explorerShell.configurePaths({
    nextSettingsPath: explorerSettingsPath,
    nextLauncherScriptPath: shellLauncherScriptPath,
    nextLauncherStatePath: shellLauncherStatePath,
    nextBackupPath: explorerShellBackupPath,
  });
  explorerShell.writeLauncherScript();

  let settings = explorerShell.loadSettings();
  const recovery = explorerShell.recoverOnStartup();
  if (!recovery.success) {
    settings = explorerShell.saveSettings({
      ...settings,
      explorerTakeoverEnabled: false,
    });
  } else {
    settings = explorerShell.saveSettings(settings);
  }

  createWindow();
  explorerShell.writeLauncherState();

  if (settings.explorerTakeoverEnabled) {
    const armResult = explorerShell.armTakeover();
    if (!armResult.success) {
      settings = explorerShell.saveSettings({
        ...settings,
        explorerTakeoverEnabled: false,
      });
    } else {
      settings = explorerShell.saveSettings(settings);
    }
  }

  if (initialShellLaunch?.isShellRequest) {
    enqueueExplorerOpen(initialShellLaunch.targetPath, 'shell');
  }
}

if (hasSingleInstanceLock) {
  app.whenReady().then(bootstrapApp);

  app.on('second-instance', (event, argv, workingDirectory, additionalData) => {
    const shellLaunch = additionalData?.shellLaunch || parseShellLaunchArgs(argv);

    if (shellLaunch?.isShellRequest) {
      enqueueExplorerOpen(shellLaunch.targetPath, 'shell');
    }

    focusMainWindow();
  });

  app.on('window-all-closed', () => {
    stopDirectoryWatchersForOwner(mainWindow?.webContents.id);
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
      flushExplorerOpenQueue();
    }
  });

  app.on('before-quit', () => {
    try {
      for (const watcherKey of Array.from(directoryWatchers.keys())) {
        stopDirectoryWatcher(watcherKey);
      }
      if (explorerShell) {
        const restoreResult = explorerShell.restoreNativeShell('shutdown');
        if (!restoreResult.success) {
          explorerShell.saveSettings({
            ...explorerShell.loadSettings(),
            explorerTakeoverEnabled: false,
          });
        }
        explorerShell.clearLauncherState();
      }
    } catch (error) {
      console.warn('[ShellIntegration] Failed during quit cleanup', error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM METRICS HELPERS
// ═══════════════════════════════════════════════════════════════

function snapshotCpuTimes() {
  const cpus = os.cpus();
  return cpus.reduce(
    (acc, cpu) => {
      const times = cpu.times;
      acc.total += times.user + times.nice + times.sys + times.irq + times.idle;
      acc.idle += times.idle;
      return acc;
    },
    { total: 0, idle: 0 }
  );
}

function calculateCpuUsage() {
  const current = snapshotCpuTimes();
  if (!lastCpuSample) {
    lastCpuSample = current;
    return null;
  }
  const totalDiff = current.total - lastCpuSample.total;
  const idleDiff = current.idle - lastCpuSample.idle;
  lastCpuSample = current;
  if (totalDiff <= 0) return null;
  const usage = (1 - idleDiff / totalDiff) * 100;
  return Math.max(0, Math.min(100, usage));
}

// ═══════════════════════════════════════════════════════════════
// WIDGET MOUSE PASSTHROUGH - Desktop widget click-through
// ═══════════════════════════════════════════════════════════════

ipcMain.on('widget:mouse-enter', () => {
  mainWindow?.setIgnoreMouseEvents(false);
});

ipcMain.on('widget:mouse-leave', () => {
  mainWindow?.setIgnoreMouseEvents(true, { forward: true });
});

// Toggle always on top
ipcMain.handle('widget:set-always-on-top', (event, value) => {
  mainWindow?.setAlwaysOnTop(value);
  return { success: true, alwaysOnTop: value };
});

ipcMain.on('explorer:renderer-ready', () => {
  rendererExplorerChannelReady = true;
  flushExplorerOpenQueue();
});

ipcMain.handle('explorer:get-settings', async () => {
  return explorerShell
    ? explorerShell.loadSettings()
    : {
      explorerTakeoverEnabled: true,
      explorerTakeoverState: 'native',
    };
});

ipcMain.handle('explorer:set-settings', async (event, nextSettings = {}) => {
  if (!explorerShell) {
    return {
      explorerTakeoverEnabled: true,
      explorerTakeoverState: 'native',
    };
  }

  let normalized = explorerShell.saveSettings({
    ...explorerShell.loadSettings(),
    ...nextSettings,
  });

  if (normalized.explorerTakeoverEnabled) {
    explorerShell.writeLauncherState();
    const armResult = explorerShell.armTakeover();
    if (!armResult.success) {
      normalized = explorerShell.saveSettings({
        ...normalized,
        explorerTakeoverEnabled: false,
      });
    } else {
      normalized = explorerShell.saveSettings(normalized);
    }
    return normalized;
  }

  const restoreResult = explorerShell.restoreNativeShell('toggle-off');
  if (!restoreResult.success) {
    normalized = explorerShell.saveSettings({
      ...normalized,
      explorerTakeoverEnabled: false,
    });
  } else {
    normalized = explorerShell.saveSettings(normalized);
  }

  return normalized;
});

ipcMain.handle('explorer:invalidate-dir-cache', async (event, dirPath) => {
  if (!explorerService) {
    return {
      success: false,
      path: dirPath,
    };
  }
  return explorerService.invalidateDirectoryCache(dirPath);
});

// ═══════════════════════════════════════════════════════════════
// IPC HANDLERS - System Interaction Bridge
// ═══════════════════════════════════════════════════════════════

// Execute shell command
ipcMain.handle('system:exec', async (event, command, options = {}) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    exec(command, {
      cwd: options.cwd || os.homedir(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10,
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: error?.code || 0,
        duration: Date.now() - startTime,
        command,
      });
    });
  });
});

// Spawn long-running process with streaming
ipcMain.handle('system:spawn', async (event, command, args = [], options = {}) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    
    const child = spawn(command, args, {
      cwd: options.cwd || os.homedir(),
      shell: true,
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      mainWindow?.webContents.send('system:output', {
        type: 'stdout',
        data: data.toString(),
        pid: child.pid,
      });
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      mainWindow?.webContents.send('system:output', {
        type: 'stderr',
        data: data.toString(),
        pid: child.pid,
      });
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code,
        duration: Date.now() - startTime,
        pid: child.pid,
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr: err.message,
        exitCode: -1,
        duration: Date.now() - startTime,
      });
    });
  });
});

// Read file
ipcMain.handle('fs:read', async (event, filePath) => {
  try {
    const resolvedPath = filePath.startsWith('~') 
      ? path.join(os.homedir(), filePath.slice(1))
      : filePath;
    
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const stats = fs.statSync(resolvedPath);
    
    return {
      success: true,
      content,
      path: resolvedPath,
      size: stats.size,
      modified: stats.mtime,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath,
    };
  }
});

// Write file
ipcMain.handle('fs:write', async (event, filePath, content) => {
  try {
    const resolvedPath = filePath.startsWith('~') 
      ? path.join(os.homedir(), filePath.slice(1))
      : filePath;
    
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(resolvedPath, content, 'utf-8');
    
    return {
      success: true,
      path: resolvedPath,
      bytesWritten: Buffer.byteLength(content),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath,
    };
  }
});

// List directory
ipcMain.handle('fs:list', async (event, dirPath, options = {}) => {
  if (!explorerService) {
    return {
      success: false,
      path: dirPath,
      items: [],
      data: [],
      status: 'error',
      requestId: options?.requestId,
      error: 'Explorer service not available',
    };
  }

  return explorerService.listDirectory(dirPath, options);
});

// Get system info
ipcMain.handle('system:info', async () => {
  return {
    platform: process.platform,
    arch: os.arch(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cpus: os.cpus().length,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    uptime: os.uptime(),
  };
});

// Get live system metrics (CPU/RAM/GPU/Disk/Network)
ipcMain.handle('system:metrics', async () => {
  const now = Date.now();
  const cpuInfo = os.cpus();
  const cpuUsage = calculateCpuUsage();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0;

  let gpuInfo = null;
  if (systemInfoProvider) {
    if (!gpuInfoCache || now - gpuInfoCacheTimestamp > GPU_METRICS_TTL) {
      const graphics = await systemInfoProvider.graphics();
      if (graphics?.controllers?.length > 0) {
        const controller = graphics.controllers[0];
        gpuInfoCache = {
          name: controller.model,
          vendor: controller.vendor,
          memoryTotal: controller.vram ? controller.vram * 1024 * 1024 : null,
          memoryUsed: controller.vramUsed ? controller.vramUsed * 1024 * 1024 : null,
          usage: typeof controller.utilizationGpu === 'number' ? controller.utilizationGpu : null,
          driverVersion: controller.driverVersion,
        };
        gpuInfoCacheTimestamp = now;
      }
    }
    gpuInfo = gpuInfoCache;
  }

  if (!gpuInfo) {
    if (!gpuInfoCache) {
      try {
        gpuInfoCache = await app.getGPUInfo('basic');
      } catch (error) {
        gpuInfoCache = null;
      }
    }
    const device = Array.isArray(gpuInfoCache?.gpuDevice) ? gpuInfoCache.gpuDevice[0] : null;
    gpuInfo = {
      name: device?.deviceString || gpuInfoCache?.renderer || 'GPU',
      vendor: device?.vendorString,
      memoryTotal: null,
      memoryUsed: null,
      usage: null,
    };
  }

  let diskInfo = fullMetricsCache.disk || [];
  let networkInfo = fullMetricsCache.network || [];
  let temperatureInfo = fullMetricsCache.temperature || {};

  if (systemInfoProvider && (now - fullMetricsCache.timestamp > FULL_METRICS_TTL)) {
    const disks = await systemInfoProvider.fsSize();
    diskInfo = disks.map((disk) => ({
      mount: disk.mount,
      total: disk.size,
      used: disk.used,
      usage: disk.use,
      fsType: disk.type,
    }));

    const nets = await systemInfoProvider.networkStats();
    networkInfo = nets.map((net) => ({
      iface: net.iface,
      rx: net.rx_bytes,
      tx: net.tx_bytes,
      rxSec: net.rx_sec,
      txSec: net.tx_sec,
    }));

    const temps = await systemInfoProvider.cpuTemperature();
    temperatureInfo = {
      cpu: typeof temps.main === 'number' ? temps.main : null,
    };

    fullMetricsCache = {
      timestamp: now,
      disk: diskInfo,
      network: networkInfo,
      temperature: temperatureInfo,
    };
  }

  return {
    timestamp: Date.now(),
    cpu: {
      usage: cpuUsage !== null ? Math.round(cpuUsage * 10) / 10 : null,
      cores: cpuInfo.length,
      model: cpuInfo[0]?.model,
      speedMHz: cpuInfo[0]?.speed,
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usage: memUsage,
    },
    gpu: gpuInfo,
    disk: diskInfo,
    network: networkInfo,
    uptime: os.uptime(),
    temperature: temperatureInfo,
  };
});

// Get file icon as data URL
ipcMain.handle('system:icon', async (event, filePath) => {
  if (!explorerService) {
    return {
      success: false,
      path: filePath,
      error: 'Explorer service not available',
    };
  }

  try {
    return await explorerService.getFileIcon(filePath);
  } catch (error) {
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('system:icons', async (event, entries = []) => {
  if (!explorerService) {
    return {
      success: false,
      icons: [],
    };
  }
  return explorerService.getFileIcons(entries);
});

ipcMain.handle('system:shortcut', async (event, filePath) => {
  return resolveWindowsShortcut(filePath);
});

ipcMain.handle('system:network-mounts', async () => {
  if (!explorerService) {
    return { success: false, data: [], status: 'error', source: 'live' };
  }
  return explorerService.getNetworkMounts();
});

ipcMain.handle('fs:watch-dir', async (event, dirPath) => {
  const ownerId = event.sender.id;
  const resolvedPath = resolveTilde(dirPath);
  const watcherKey = getDirectoryWatcherKey(ownerId, resolvedPath);

  stopDirectoryWatcher(watcherKey);

  try {
    const watcher = fs.watch(resolvedPath, { persistent: false }, (eventType, filename) => {
      const currentEntry = directoryWatchers.get(watcherKey);
      if (!currentEntry) return;

      if (currentEntry.timeout) {
        clearTimeout(currentEntry.timeout);
      }

      currentEntry.timeout = setTimeout(() => {
        emitDirectoryWatchEvent(ownerId, {
          path: resolvedPath,
          eventType,
          filename: filename ? filename.toString() : '',
          timestamp: Date.now(),
        });
      }, 120);
    });

    directoryWatchers.set(watcherKey, {
      ownerId,
      path: resolvedPath,
      watcher,
      timeout: null,
    });

    return {
      success: true,
      path: resolvedPath,
    };
  } catch (error) {
    return {
      success: false,
      path: resolvedPath,
      error: error.message,
    };
  }
});

ipcMain.handle('fs:unwatch-dir', async (event, dirPath) => {
  const ownerId = event.sender.id;
  const resolvedPath = resolveTilde(dirPath);
  stopDirectoryWatcher(getDirectoryWatcherKey(ownerId, resolvedPath));
  return {
    success: true,
    path: resolvedPath,
  };
});

ipcMain.handle('system:listening-services', async () => {
  if (!explorerService) {
    return { success: false, data: [], status: 'error', source: 'live' };
  }
  return explorerService.getListeningServices();
});

// Check if path exists
ipcMain.handle('fs:exists', async (event, filePath) => {
  const resolvedPath = filePath.startsWith('~') 
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  
  return {
    exists: fs.existsSync(resolvedPath),
    path: resolvedPath,
  };
});

// Delete file or directory
ipcMain.handle('fs:delete', async (event, filePath, options = {}) => {
  try {
    const resolvedPath = filePath.startsWith('~') 
      ? path.join(os.homedir(), filePath.slice(1))
      : filePath;
    
    const stats = fs.statSync(resolvedPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(resolvedPath, { recursive: options.recursive || false });
    } else {
      fs.unlinkSync(resolvedPath);
    }
    
    return {
      success: true,
      path: resolvedPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath,
    };
  }
});

// ═══════════════════════════════════════════════════════════════
// ENHANCED FS — rename, mkdir, stat, copy, move, search
// ═══════════════════════════════════════════════════════════════

function resolveTilde(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(resolveTilde(oldPath), resolveTilde(newPath));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
  try {
    fs.mkdirSync(resolveTilde(dirPath), { recursive: true });
    return { success: true, path: resolveTilde(dirPath) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:stat', async (event, filePath) => {
  try {
    const resolved = resolveTilde(filePath);
    const stats = fs.statSync(resolved);
    return {
      success: true,
      path: resolved,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime,
      permissions: stats.mode.toString(8),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:copy', async (event, src, dest) => {
  try {
    const resolvedSrc = resolveTilde(src);
    const resolvedDest = resolveTilde(dest);
    const stats = fs.statSync(resolvedSrc);
    if (stats.isDirectory()) {
      fs.cpSync(resolvedSrc, resolvedDest, { recursive: true });
    } else {
      fs.copyFileSync(resolvedSrc, resolvedDest);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:move', async (event, src, dest) => {
  try {
    fs.renameSync(resolveTilde(src), resolveTilde(dest));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:search', async (event, dirPath, query, options = {}) => {
  return new Promise((resolve) => {
    const resolved = resolveTilde(dirPath);
    const maxResults = options.maxResults || 100;
    let cmd;
    if (process.platform === 'win32') {
      cmd = `Get-ChildItem -Path "${resolved}" -Recurse -Filter "*${query}*" -ErrorAction SilentlyContinue | Select-Object -First ${maxResults} | ForEach-Object { $_.FullName }`;
    } else {
      cmd = `find "${resolved}" -maxdepth 5 -iname "*${query}*" 2>/dev/null | head -${maxResults}`;
    }
    exec(cmd, { timeout: 15000, shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash' }, (error, stdout) => {
      const results = stdout.toString().trim().split('\n').filter(Boolean);
      resolve({ success: true, results });
    });
  });
});

ipcMain.handle('fs:drives', async () => {
  if (!explorerService) {
    return { success: false, data: [], status: 'error', source: 'live' };
  }
  return explorerService.getDrives();
});

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
