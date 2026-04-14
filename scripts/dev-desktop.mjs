import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

let shuttingDown = false;
let electronProcess = null;

function spawnNpm(args, cwd) {
  if (isWindows) {
    return spawn('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
      cwd,
      stdio: 'inherit',
    });
  }

  return spawn('npm', args, {
    cwd,
    stdio: 'inherit',
  });
}

const viteProcess = spawnNpm(['run', 'dev'], rootDir);

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(attempt, 400);
      });
    };

    attempt();
  });
}

function terminateChild(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f']);
    return;
  }
  child.kill('SIGTERM');
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
viteProcess.on('exit', (code) => shutdown(code ?? 0));

async function main() {
  try {
    await waitForServer('http://127.0.0.1:8080');
  } catch (error) {
    console.error('[dev:desktop] Vite server did not become ready:', error.message);
    shutdown(1);
    return;
  }

  electronProcess = spawnNpm(['run', 'start'], path.join(rootDir, 'electron'));

  electronProcess.on('exit', (code) => shutdown(code ?? 0));
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  terminateChild(electronProcess);
  terminateChild(viteProcess);
  setTimeout(() => process.exit(code), 150);
}

void main();
