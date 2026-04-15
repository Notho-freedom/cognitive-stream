const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DIRECTORY_CACHE_TTL_MS = 5000;
const THIS_PC_CACHE_TTL_MS = 15000;
const NETWORK_CACHE_TTL_MS = 30000;
const ICON_PATH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ICON_EXTENSION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DIRECTORY_READ_TIMEOUT_MS = 4500;
const DIRECTORY_STAT_TIMEOUT_MS = 180;
const DATASET_TIMEOUT_MS = 2500;
const DIRECTORY_STAT_CONCURRENCY = 24;
const ICON_LOAD_CONCURRENCY = 6;

function ensureDirectory(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashCacheKey(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function resolveTilde(targetPath) {
  if (!targetPath) return targetPath;
  return targetPath.startsWith('~') ? path.join(os.homedir(), targetPath.slice(1)) : targetPath;
}

function parseCacheEnvelope(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return null;
  if (!('value' in rawValue) || typeof rawValue.savedAt !== 'number') return null;
  return rawValue;
}

function isCacheFresh(envelope, ttlMs) {
  return Boolean(envelope) && Date.now() - envelope.savedAt <= ttlMs;
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

function createTimeoutError(message) {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId = null;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(createTimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let currentIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const nextIndex = currentIndex++;
      results[nextIndex] = await worker(items[nextIndex], nextIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

function createExplorerService({
  app,
  systemInfoProvider,
  runPowerShellAsync,
}) {
  let cacheRootPath = null;
  const layeredCacheMemory = new Map();
  const systemIconCache = new Map();
  const extensionIconCache = new Map();

  function getCacheFilePath(cacheKey) {
    if (!cacheRootPath) return null;
    return path.join(cacheRootPath, `${hashCacheKey(cacheKey)}.json`);
  }

  function setCacheRootPath(nextCacheRootPath) {
    cacheRootPath = nextCacheRootPath;
    ensureDirectory(cacheRootPath);
  }

  function readJsonFile(filePath, fallbackValue) {
    if (!filePath || !fs.existsSync(filePath)) {
      return fallbackValue;
    }

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJsonFile(filePath, value) {
    if (!filePath) return;
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  }

  function buildResponse({
    success,
    data,
    status = 'ready',
    source,
    lastUpdatedAt,
    error,
    requestId,
    extra = {},
  }) {
    return {
      success,
      data,
      status,
      source,
      lastUpdatedAt,
      error,
      requestId,
      ...extra,
    };
  }

  function createCacheResultFromEnvelope(envelope, source, requestId, status = 'ready', extra = {}) {
    if (!envelope) return null;
    return buildResponse({
      success: true,
      data: envelope.value,
      status,
      source,
      lastUpdatedAt: envelope.savedAt,
      requestId,
      extra,
    });
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
      // Best effort only.
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

  async function readLayeredCache(cacheKey, ttlMs, requestId, extra = {}) {
    const memoryEntry = parseCacheEnvelope(layeredCacheMemory.get(cacheKey));
    if (isCacheFresh(memoryEntry, ttlMs)) {
      return createCacheResultFromEnvelope(memoryEntry, 'memory', requestId, 'ready', extra);
    }

    const cacheFilePath = getCacheFilePath(cacheKey);
    const diskEntry = parseCacheEnvelope(readJsonFile(cacheFilePath, null));
    if (isCacheFresh(diskEntry, ttlMs)) {
      layeredCacheMemory.set(cacheKey, diskEntry);
      return createCacheResultFromEnvelope(diskEntry, 'disk', requestId, 'ready', extra);
    }

    const redisEntry = await getRedisCacheEnvelope(cacheKey);
    if (isCacheFresh(redisEntry, ttlMs)) {
      layeredCacheMemory.set(cacheKey, redisEntry);
      if (cacheFilePath) {
        writeJsonFile(cacheFilePath, redisEntry);
      }
      return createCacheResultFromEnvelope(redisEntry, 'redis', requestId, 'ready', extra);
    }

    return null;
  }

  async function readAnyLayeredCache(cacheKey, requestId, extra = {}) {
    const memoryEntry = parseCacheEnvelope(layeredCacheMemory.get(cacheKey));
    if (memoryEntry) {
      return createCacheResultFromEnvelope(memoryEntry, 'memory', requestId, 'stale', extra);
    }

    const cacheFilePath = getCacheFilePath(cacheKey);
    const diskEntry = parseCacheEnvelope(readJsonFile(cacheFilePath, null));
    if (diskEntry) {
      layeredCacheMemory.set(cacheKey, diskEntry);
      return createCacheResultFromEnvelope(diskEntry, 'disk', requestId, 'stale', extra);
    }

    const redisEntry = await getRedisCacheEnvelope(cacheKey);
    if (redisEntry) {
      layeredCacheMemory.set(cacheKey, redisEntry);
      if (cacheFilePath) {
        writeJsonFile(cacheFilePath, redisEntry);
      }
      return createCacheResultFromEnvelope(redisEntry, 'redis', requestId, 'stale', extra);
    }

    return null;
  }

  async function writeLayeredCache(cacheKey, ttlMs, value) {
    const envelope = {
      savedAt: Date.now(),
      ttlMs,
      value,
    };

    layeredCacheMemory.set(cacheKey, envelope);

    const cacheFilePath = getCacheFilePath(cacheKey);
    if (cacheFilePath) {
      writeJsonFile(cacheFilePath, envelope);
    }

    void setRedisCacheEnvelope(cacheKey, envelope, ttlMs);
    return envelope;
  }

  async function invalidateLayeredCache(cacheKey) {
    layeredCacheMemory.delete(cacheKey);

    const cacheFilePath = getCacheFilePath(cacheKey);
    if (cacheFilePath && fs.existsSync(cacheFilePath)) {
      try {
        fs.unlinkSync(cacheFilePath);
      } catch (error) {
        console.warn('[ExplorerService] Failed to remove cache file', cacheFilePath, error);
      }
    }

    await deleteRedisCacheEnvelope(cacheKey);
  }

  async function resolveCachedDataset(cacheKey, ttlMs, requestId, liveLoader, extra = {}) {
    const cached = await readLayeredCache(cacheKey, ttlMs, requestId, extra);
    if (cached) {
      return cached;
    }

    try {
      const liveData = await liveLoader();
      const liveStatus = liveData?.status === 'partial' ? 'partial' : 'ready';
      const value = Object.prototype.hasOwnProperty.call(liveData || {}, 'data') ? liveData.data : liveData;
      const envelope = await writeLayeredCache(cacheKey, ttlMs, value);

      return buildResponse({
        success: true,
        data: value,
        status: liveStatus,
        source: 'live',
        lastUpdatedAt: envelope.savedAt,
        requestId,
        extra,
      });
    } catch (error) {
      const stale = await readAnyLayeredCache(cacheKey, requestId, extra);
      if (stale) {
        return {
          ...stale,
          status: error?.name === 'TimeoutError' ? 'timeout' : 'stale',
          error: error instanceof Error ? error.message : 'Unknown cache loader error',
        };
      }

      return buildResponse({
        success: false,
        data: Array.isArray(extra.items) ? extra.items : [],
        status: error?.name === 'TimeoutError' ? 'timeout' : 'error',
        error: error instanceof Error ? error.message : 'Unknown cache loader error',
        requestId,
        extra,
      });
    }
  }

  async function statDirectoryEntry(resolvedPath, entry) {
    const fullPath = path.join(resolvedPath, entry.name);
    const fallback = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      size: 0,
      modified: null,
    };

    try {
      const stats = await withTimeout(
        fs.promises.stat(fullPath),
        DIRECTORY_STAT_TIMEOUT_MS,
        `Stat timed out for ${entry.name}`
      );

      return {
        item: {
          ...fallback,
          size: stats.size,
          modified: stats.mtime,
        },
        partial: false,
      };
    } catch (error) {
      return {
        item: fallback,
        partial: true,
      };
    }
  }

  async function buildDirectorySnapshot(resolvedPath, options = {}) {
    const entries = await withTimeout(
      fs.promises.readdir(resolvedPath, { withFileTypes: true }),
      DIRECTORY_READ_TIMEOUT_MS,
      `Directory read timed out for ${resolvedPath}`
    );

    let partial = false;
    const statResults = await mapLimit(entries, DIRECTORY_STAT_CONCURRENCY, async (entry) => {
      const next = await statDirectoryEntry(resolvedPath, entry);
      partial = partial || next.partial;
      return next.item;
    });

    const filtered = options.showHidden
      ? statResults
      : statResults.filter((item) => !item.name.startsWith('.'));

    filtered.sort((left, right) => {
      if (left.isDirectory && !right.isDirectory) return -1;
      if (!left.isDirectory && right.isDirectory) return 1;
      return left.name.localeCompare(right.name, 'fr-FR');
    });

    return {
      data: filtered,
      status: partial ? 'partial' : 'ready',
    };
  }

  function normalizeListResponse(result, resolvedPath, requestId) {
    const data = Array.isArray(result?.data) ? result.data : [];
    return {
      ...result,
      path: resolvedPath,
      items: data,
      requestId,
    };
  }

  async function listDirectory(dirPath, options = {}) {
    const requestId = options.requestId || crypto.randomUUID();
    const resolvedPath = resolveTilde(dirPath);
    const cacheKey = `explorer:dir:${hashCacheKey(resolvedPath)}`;

    const cached = await readLayeredCache(cacheKey, DIRECTORY_CACHE_TTL_MS, requestId);
    if (cached) {
      return normalizeListResponse(cached, resolvedPath, requestId);
    }

    try {
      const snapshot = await buildDirectorySnapshot(resolvedPath, options);
      const envelope = await writeLayeredCache(cacheKey, DIRECTORY_CACHE_TTL_MS, snapshot.data);

      return normalizeListResponse(
        buildResponse({
          success: true,
          data: snapshot.data,
          status: snapshot.status,
          source: 'live',
          lastUpdatedAt: envelope.savedAt,
          requestId,
        }),
        resolvedPath,
        requestId
      );
    } catch (error) {
      const stale = await readAnyLayeredCache(cacheKey, requestId);
      if (stale) {
        return normalizeListResponse(
          {
            ...stale,
            status: error?.name === 'TimeoutError' ? 'timeout' : 'stale',
            error: error instanceof Error ? error.message : 'Failed to list directory',
          },
          resolvedPath,
          requestId
        );
      }

      return normalizeListResponse(
        buildResponse({
          success: false,
          data: [],
          status: error?.name === 'TimeoutError' ? 'timeout' : 'error',
          error: error instanceof Error ? error.message : 'Failed to list directory',
          requestId,
        }),
        resolvedPath,
        requestId
      );
    }
  }

  async function getDrives(requestId = crypto.randomUUID()) {
    return resolveCachedDataset(
      'explorer:virtual:this-pc',
      THIS_PC_CACHE_TTL_MS,
      requestId,
      async () => {
        if (systemInfoProvider?.fsSize) {
          const disks = await withTimeout(
            systemInfoProvider.fsSize(),
            DATASET_TIMEOUT_MS,
            'Drive enumeration timed out'
          );

          return disks.map((disk) => ({
            mount: disk.mount,
            total: disk.size,
            used: disk.used,
            usage: disk.use,
            fsType: disk.type,
            label: disk.fs || disk.mount,
          }));
        }

        if (process.platform === 'win32') {
          const script = `
$drives = Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue |
  Where-Object { $_.DriveType -in 2,3,4,5 } |
  ForEach-Object {
    $total = [double]($_.Size)
    $free = [double]($_.FreeSpace)
    $used = $total - $free
    [PSCustomObject]@{
      mount = $_.DeviceID + '\\'
      total = [math]::Round($total)
      used = [math]::Round($used)
      usage = if ($total -gt 0) { [math]::Round(($used / $total) * 100, 2) } else { 0 }
      fsType = $_.FileSystem
      label = if ([string]::IsNullOrWhiteSpace($_.VolumeName)) { $_.DeviceID } else { $_.VolumeName }
    }
  }
$drives | ConvertTo-Json -Compress
`;

          return parseJsonCommandOutput(
            await runPowerShellAsync(script, { timeout: DATASET_TIMEOUT_MS }),
            []
          );
        }

        return [];
      }
    );
  }

  async function getNetworkMounts(requestId = crypto.randomUUID()) {
    if (process.platform !== 'win32') {
      return buildResponse({
        success: true,
        data: [],
        status: 'ready',
        source: 'live',
        requestId,
      });
    }

    const script = `
$drives = Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayRoot -or $_.Root -like '\\\\*' } |
  ForEach-Object {
    [PSCustomObject]@{
      name = $_.Name
      root = $_.Root
      displayRoot = $_.DisplayRoot
      used = $_.Used
      free = $_.Free
    }
  }
$drives | ConvertTo-Json -Compress
`;

    return resolveCachedDataset(
      'explorer:virtual:network',
      NETWORK_CACHE_TTL_MS,
      requestId,
      async () => parseJsonCommandOutput(
        await runPowerShellAsync(script, { timeout: DATASET_TIMEOUT_MS }),
        []
      )
    );
  }

  async function getListeningServices(requestId = crypto.randomUUID()) {
    if (process.platform !== 'win32') {
      return buildResponse({
        success: true,
        data: [],
        status: 'ready',
        source: 'live',
        requestId,
      });
    }

    const script = `
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::1', '::') } |
  Sort-Object LocalPort -Unique |
  ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      address = $_.LocalAddress
      port = $_.LocalPort
      pid = $_.OwningProcess
      processName = if ($proc) { $proc.ProcessName } else { $null }
      url = "http://localhost:$($_.LocalPort)"
    }
  }
$connections | ConvertTo-Json -Compress
`;

    return resolveCachedDataset(
      'explorer:virtual:network:services',
      NETWORK_CACHE_TTL_MS,
      requestId,
      async () => parseJsonCommandOutput(
        await runPowerShellAsync(script, { timeout: DATASET_TIMEOUT_MS }),
        []
      )
    );
  }

  function getExtensionCacheMeta(entry) {
    const filePath = entry?.path || '';
    const extension = (entry?.extension || path.extname(filePath)).toLowerCase();
    const isDirectory = Boolean(entry?.isDirectory);
    const extCacheable = extension && !isDirectory && !['.exe', '.lnk', '.url', '.appref-ms', '.ico'].includes(extension);

    if (extCacheable) {
      return { scope: 'extension', key: extension, ttlMs: ICON_EXTENSION_CACHE_TTL_MS };
    }

    return { scope: 'path', key: filePath, ttlMs: ICON_PATH_CACHE_TTL_MS };
  }

  async function getSingleFileIcon(filePath) {
    const result = await loadSystemIcon({
      key: filePath,
      path: filePath,
      isDirectory: false,
    });

    return {
      success: result.success,
      path: filePath,
      dataUrl: result.dataUrl,
      error: result.error,
    };
  }

  async function loadSystemIcon(entry) {
    const originalPath = entry?.path || '';
    const resolvedPath = resolveTilde(originalPath);
    const requestKey = entry?.key || originalPath;

    try {
      await fs.promises.access(resolvedPath, fs.constants.F_OK);
    } catch (error) {
      return {
        success: false,
        key: requestKey,
        path: originalPath,
        error: 'Path not found',
      };
    }

    const cacheMeta = getExtensionCacheMeta(entry);
    const inMemoryCache = cacheMeta.scope === 'extension' ? extensionIconCache : systemIconCache;
    const layeredKey = cacheMeta.scope === 'extension'
      ? `explorer:icon:ext:${cacheMeta.key}`
      : `explorer:icon:path:${hashCacheKey(cacheMeta.key)}`;

    if (inMemoryCache.has(cacheMeta.key)) {
      return {
        success: true,
        key: requestKey,
        path: originalPath,
        dataUrl: inMemoryCache.get(cacheMeta.key),
        cacheScope: cacheMeta.scope,
      };
    }

    const layeredCache = await readLayeredCache(layeredKey, cacheMeta.ttlMs, requestKey);
    if (layeredCache?.data) {
      inMemoryCache.set(cacheMeta.key, layeredCache.data);
      return {
        success: true,
        key: requestKey,
        path: originalPath,
        dataUrl: layeredCache.data,
        cacheScope: cacheMeta.scope,
      };
    }

    const image = await app.getFileIcon(resolvedPath, { size: 'large' });
    const dataUrl = image.toDataURL();
    inMemoryCache.set(cacheMeta.key, dataUrl);
    await writeLayeredCache(layeredKey, cacheMeta.ttlMs, dataUrl);

    return {
      success: true,
      key: requestKey,
      path: originalPath,
      dataUrl,
      cacheScope: cacheMeta.scope,
    };
  }

  async function getFileIcons(entries = []) {
    const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
    const icons = await mapLimit(safeEntries, ICON_LOAD_CONCURRENCY, async (entry) => {
      try {
        return await loadSystemIcon(entry);
      } catch (error) {
        return {
          success: false,
          key: entry?.key || entry?.path || '',
          path: entry?.path || '',
          error: error instanceof Error ? error.message : 'Unknown icon error',
        };
      }
    });

    return {
      success: true,
      icons,
    };
  }

  async function invalidateDirectoryCache(dirPath) {
    const resolvedPath = resolveTilde(dirPath);
    await invalidateLayeredCache(`explorer:dir:${hashCacheKey(resolvedPath)}`);
    return {
      success: true,
      path: resolvedPath,
    };
  }

  return {
    setCacheRootPath,
    listDirectory,
    getDrives,
    getNetworkMounts,
    getListeningServices,
    getFileIcon: getSingleFileIcon,
    getFileIcons,
    invalidateDirectoryCache,
    resolveTilde,
  };
}

module.exports = {
  createExplorerService,
};
