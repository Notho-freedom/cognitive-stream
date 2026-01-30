const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

// Keep a global reference of the window object
let mainWindow;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless for GX aesthetic
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    vibrancy: 'ultra-dark',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
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
// IPC HANDLERS - System Interaction Bridge
// ═══════════════════════════════════════════════════════════════

// Execute shell command
ipcMain.handle('system:exec', async (event, command, options = {}) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    exec(command, {
      cwd: options.cwd || os.homedir(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10, // 10MB
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
      // Stream output back to renderer
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
    
    // Ensure directory exists
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
    
    // Filter and sort
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
