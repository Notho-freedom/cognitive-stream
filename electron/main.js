const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');
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
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

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
  try {
    const resolvedPath = dirPath.startsWith('~') 
      ? path.join(os.homedir(), dirPath.slice(1))
      : dirPath;
    
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    
    const items = entries.map(entry => {
      const fullPath = path.join(resolvedPath, entry.name);
      let stats = null;
      
      try {
        stats = fs.statSync(fullPath);
      } catch {}
      
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: stats?.size || 0,
        modified: stats?.mtime || null,
      };
    });
    
    const filtered = options.showHidden 
      ? items 
      : items.filter(i => !i.name.startsWith('.'));
    
    return {
      success: true,
      path: resolvedPath,
      items: filtered.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: dirPath,
    };
  }
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
  try {
    const image = await app.getFileIcon(filePath, { size: 'normal' });
    return { success: true, path: filePath, dataUrl: image.toDataURL() };
  } catch (error) {
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('system:shortcut', async (event, filePath) => {
  return resolveWindowsShortcut(filePath);
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
