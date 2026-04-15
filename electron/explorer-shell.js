const fs = require('fs');
const path = require('path');

const WINDOWS_EXPLORER_CLSID = '{52205fd8-5dfb-447d-801a-d0b52f2e83e1}';
const EXPLORER_SHELL_OWNER = 'cognitive-stream';
const EXPLORER_TAKEOVER_VERSION = 4;
const TAKEOVER_KEYS = [
  'HKCU\\Software\\Classes\\Drive\\shell\\open\\command',
  'HKCU\\Software\\Classes\\Directory\\shell\\open\\command',
  'HKCU\\Software\\Classes\\Folder\\shell\\open\\command',
  'HKCU\\Software\\Classes\\Folder\\shell\\explore\\command',
  `HKCU\\Software\\Classes\\CLSID\\${WINDOWS_EXPLORER_CLSID}\\shell\\opennewwindow\\command`,
];

const EXPLORER_SETTINGS_DEFAULTS = {
  explorerTakeoverEnabled: true,
  explorerTakeoverState: 'native',
};

function ensureDirectory(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
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

function createExplorerShellManager({
  app,
  runPowerShell,
  refreshWindowsShellAssociations,
  shellOpenFlag,
  shellOpenHomeFlag,
}) {
  let settingsPath = null;
  let launcherScriptPath = null;
  let launcherStatePath = null;
  let backupPath = null;
  let runtimeTakeoverState = 'native';

  function escapePowerShellString(value) {
    return String(value).replace(/'/g, "''");
  }

  function normalizeSettings(partialSettings = {}) {
    const nextEnabled = partialSettings?.explorerTakeoverEnabled ?? partialSettings?.explorerIntegrationEnabled;
    const nextState = partialSettings?.explorerTakeoverState;

    return {
      explorerTakeoverEnabled: typeof nextEnabled === 'boolean'
        ? nextEnabled
        : EXPLORER_SETTINGS_DEFAULTS.explorerTakeoverEnabled,
      explorerTakeoverState: ['native', 'armed', 'restoring', 'degraded'].includes(nextState)
        ? nextState
        : EXPLORER_SETTINGS_DEFAULTS.explorerTakeoverState,
    };
  }

  function setRuntimeTakeoverState(nextState) {
    runtimeTakeoverState = ['native', 'armed', 'restoring', 'degraded'].includes(nextState)
      ? nextState
      : 'native';
  }

  function getRuntimeTakeoverState() {
    return runtimeTakeoverState;
  }

  function loadSettings() {
    const stored = readJsonFile(settingsPath, EXPLORER_SETTINGS_DEFAULTS);
    return {
      ...normalizeSettings(stored),
      explorerTakeoverState: runtimeTakeoverState,
    };
  }

  function saveSettings(nextSettings = {}) {
    const current = readJsonFile(settingsPath, EXPLORER_SETTINGS_DEFAULTS);
    const normalized = normalizeSettings({
      ...current,
      ...nextSettings,
    });

    writeJsonFile(settingsPath, {
      version: EXPLORER_TAKEOVER_VERSION,
      ...normalized,
    });

    return {
      ...normalized,
      explorerTakeoverState: runtimeTakeoverState,
    };
  }

  function configurePaths({
    nextSettingsPath,
    nextLauncherScriptPath,
    nextLauncherStatePath,
    nextBackupPath,
  }) {
    settingsPath = nextSettingsPath;
    launcherScriptPath = nextLauncherScriptPath;
    launcherStatePath = nextLauncherStatePath;
    backupPath = nextBackupPath;
  }

  function setRegistryValue(key, valueName, value, type = 'String') {
    const registryPath = `Registry::${key}`;
    const propertyName = valueName === '(default)' ? '(default)' : valueName;
    const serializedValue = JSON.stringify(value);
    const script = `
$path = '${escapePowerShellString(registryPath)}'
New-Item -Path $path -Force | Out-Null
$json = @'
${serializedValue}
'@
$value = ConvertFrom-Json $json
if ('${type}' -eq 'DWord') { $value = [int]$value }
if ('${type}' -eq 'QWord') { $value = [long]$value }
if ('${type}' -eq 'MultiString') { $value = [string[]]$value }
New-ItemProperty -LiteralPath $path -Name '${escapePowerShellString(propertyName)}' -Value $value -PropertyType ${type} -Force | Out-Null
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

  function readRegistryKeySnapshot(key) {
    const registryPath = `Registry::${key}`;
    const script = `
$path = '${escapePowerShellString(registryPath)}'
if (-not (Test-Path -LiteralPath $path)) {
  [PSCustomObject]@{
    key = '${escapePowerShellString(key)}'
    exists = $false
    values = @()
  } | ConvertTo-Json -Depth 5 -Compress
  exit 0
}
$registryKey = Get-Item -LiteralPath $path
$valueNames = New-Object System.Collections.Generic.List[string]
$defaultValue = $registryKey.GetValue('', $null, 'DoNotExpandEnvironmentNames')
if ($null -ne $defaultValue) {
  $valueNames.Add('')
}
foreach ($valueName in $registryKey.GetValueNames()) {
  if ($valueName -ne '') {
    $valueNames.Add($valueName)
  }
}
$values = foreach ($valueName in $valueNames) {
  $kind = $registryKey.GetValueKind($valueName).ToString()
  $raw = $registryKey.GetValue($valueName, $null, 'DoNotExpandEnvironmentNames')
  [PSCustomObject]@{
    name = if ([string]::IsNullOrEmpty($valueName)) { '(default)' } else { $valueName }
    kind = $kind
    value = $raw
  }
}
[PSCustomObject]@{
  key = '${escapePowerShellString(key)}'
  exists = $true
  values = $values
} | ConvertTo-Json -Depth 8 -Compress
`;

    try {
      const parsed = JSON.parse(runPowerShell(script).trim());
      return {
        key: parsed?.key || key,
        exists: Boolean(parsed?.exists),
        values: Array.isArray(parsed?.values)
          ? parsed.values
          : parsed?.values
            ? [parsed.values]
            : [],
      };
    } catch (error) {
      return {
        key,
        exists: false,
        values: [],
      };
    }
  }

  function sortSnapshotValues(snapshot) {
    return [...(snapshot?.values || [])].sort((left, right) => left.name.localeCompare(right.name));
  }

  function snapshotsMatch(left, right) {
    if (Boolean(left?.exists) !== Boolean(right?.exists)) {
      return false;
    }

    const leftValues = sortSnapshotValues(left);
    const rightValues = sortSnapshotValues(right);
    return JSON.stringify(leftValues) === JSON.stringify(rightValues);
  }

  function getSnapshotValue(snapshot, valueName) {
    return (snapshot?.values || []).find((entry) => entry.name.toLowerCase() === valueName.toLowerCase())?.value;
  }

  function getSnapshotCommand(snapshot) {
    return String(getSnapshotValue(snapshot, '(default)') || '');
  }

  function hasSnapshotValue(snapshot, valueName) {
    return Boolean((snapshot?.values || []).some((entry) => entry.name.toLowerCase() === valueName.toLowerCase()));
  }

  function isManagedOrLegacySnapshot(snapshot) {
    const command = getSnapshotCommand(snapshot);
    const owner = getSnapshotValue(snapshot, 'CognitiveStreamOwner');
    return Boolean(
      snapshot?.exists && (
        owner === EXPLORER_SHELL_OWNER ||
        hasSnapshotValue(snapshot, 'DelegateExecute') ||
        command.includes('shell-launcher.ps1') ||
        command.includes(shellOpenFlag) ||
        command.includes(shellOpenHomeFlag)
      )
    );
  }

  function scanManagedOrLegacyKeys() {
    return TAKEOVER_KEYS.map(readRegistryKeySnapshot).filter(isManagedOrLegacySnapshot);
  }

  function buildBackupPayload() {
    return {
      version: EXPLORER_TAKEOVER_VERSION,
      owner: EXPLORER_SHELL_OWNER,
      createdAt: Date.now(),
      keys: TAKEOVER_KEYS.map(readRegistryKeySnapshot),
    };
  }

  function writeBackupFile() {
    if (!backupPath) return null;
    if (fs.existsSync(backupPath)) {
      return readJsonFile(backupPath, null);
    }

    const payload = buildBackupPayload();
    writeJsonFile(backupPath, payload);
    return payload;
  }

  function clearBackupFile() {
    if (!backupPath || !fs.existsSync(backupPath)) return;
    try {
      fs.unlinkSync(backupPath);
    } catch (error) {
      console.warn('[ExplorerShell] Failed to clear backup file', error);
    }
  }

  function restoreSnapshot(snapshot) {
    removeRegistryKey(snapshot.key);

    if (!snapshot.exists) {
      return;
    }

    for (const entry of snapshot.values || []) {
      setRegistryValue(snapshot.key, entry.name, entry.value, entry.kind || 'String');
    }
  }

  function verifyRestoration(backupPayload) {
    if (!backupPayload?.keys?.length) {
      return scanManagedOrLegacyKeys().length === 0;
    }

    return backupPayload.keys.every((expectedSnapshot) => {
      const currentSnapshot = readRegistryKeySnapshot(expectedSnapshot.key);
      return snapshotsMatch(expectedSnapshot, currentSnapshot);
    });
  }

  function getLauncherCommandParts(mode, targetPlaceholder) {
    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      `"${launcherScriptPath}"`,
      '-Mode',
      mode,
    ];

    if (targetPlaceholder) {
      args.push('-TargetPath');
      args.push(`"${targetPlaceholder}"`);
    }

    return `powershell.exe ${args.join(' ')}`;
  }

  function writeLauncherScript() {
    if (!launcherScriptPath || !launcherStatePath) return;

    const script = `
param(
  [Parameter(Mandatory = $true)][string]$Mode,
  [string]$TargetPath
)

$statePath = '${escapePowerShellString(launcherStatePath)}'

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
  $argumentList += '${shellOpenHomeFlag}'
} else {
  $argumentList += '${shellOpenFlag}'
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

    ensureDirectory(path.dirname(launcherScriptPath));
    fs.writeFileSync(launcherScriptPath, script.trimStart(), 'utf8');
  }

  function writeLauncherState() {
    if (!launcherStatePath) return;
    writeJsonFile(launcherStatePath, {
      version: EXPLORER_TAKEOVER_VERSION,
      pid: process.pid,
      execPath: process.execPath,
      appPath: app.getAppPath(),
      isPackaged: app.isPackaged,
      updatedAt: Date.now(),
    });
  }

  function clearLauncherState() {
    if (!launcherStatePath || !fs.existsSync(launcherStatePath)) return;
    try {
      fs.unlinkSync(launcherStatePath);
    } catch (error) {
      console.warn('[ExplorerShell] Failed to clear launcher state', error);
    }
  }

  function restoreNativeShell(reason = 'manual') {
    if (process.platform !== 'win32') {
      setRuntimeTakeoverState('native');
      return { success: true, state: 'native', reason };
    }

    setRuntimeTakeoverState('restoring');
    const backupPayload = readJsonFile(backupPath, null);

    try {
      if (backupPayload?.keys?.length) {
        for (const snapshot of backupPayload.keys) {
          restoreSnapshot(snapshot);
        }
      } else {
        for (const snapshot of scanManagedOrLegacyKeys()) {
          removeRegistryKey(snapshot.key);
        }
      }

      refreshWindowsShellAssociations();
      const restored = verifyRestoration(backupPayload);
      if (!restored) {
        setRuntimeTakeoverState('degraded');
        return {
          success: false,
          state: 'degraded',
          error: 'La restauration native des clés shell a échoué.',
          reason,
        };
      }

      clearBackupFile();
      setRuntimeTakeoverState('native');
      return {
        success: true,
        state: 'native',
        reason,
      };
    } catch (error) {
      setRuntimeTakeoverState('degraded');
      return {
        success: false,
        state: 'degraded',
        error: error instanceof Error ? error.message : 'Shell restore failed',
        reason,
      };
    }
  }

  function armTakeover() {
    if (process.platform !== 'win32') {
      setRuntimeTakeoverState('native');
      return { success: true, state: 'native' };
    }

    try {
      writeBackupFile();

      const folderCommand = getLauncherCommandParts('folder', '%1');
      const homeCommand = getLauncherCommandParts('home');

      for (const key of TAKEOVER_KEYS) {
        const command = key.includes('opennewwindow') ? homeCommand : folderCommand;
        setRegistryValue(key, '(default)', command);
        setRegistryValue(key, 'CognitiveStreamOwner', EXPLORER_SHELL_OWNER);
        setRegistryValue(key, 'CognitiveStreamVersion', EXPLORER_TAKEOVER_VERSION, 'DWord');
      }

      refreshWindowsShellAssociations();

      const stillBroken = TAKEOVER_KEYS.some((key) => {
        const snapshot = readRegistryKeySnapshot(key);
        return (
          !snapshot.exists ||
          String(getSnapshotValue(snapshot, 'CognitiveStreamOwner') || '') !== EXPLORER_SHELL_OWNER ||
          hasSnapshotValue(snapshot, 'DelegateExecute')
        );
      });
      if (stillBroken) {
        const restored = restoreNativeShell('arm-failure');
        return {
          success: false,
          state: restored.state,
          error: 'Le takeover shell n’a pas pu être vérifié.',
        };
      }

      setRuntimeTakeoverState('armed');
      return {
        success: true,
        state: 'armed',
      };
    } catch (error) {
      const restored = restoreNativeShell('arm-exception');
      return {
        success: false,
        state: restored.state,
        error: error instanceof Error ? error.message : 'Shell takeover failed',
      };
    }
  }

  function recoverOnStartup() {
    if (process.platform !== 'win32') {
      setRuntimeTakeoverState('native');
      return { success: true, state: 'native', recovered: false };
    }

    const hasBackup = Boolean(backupPath && fs.existsSync(backupPath));
    const legacySnapshots = scanManagedOrLegacyKeys();
    if (!hasBackup && legacySnapshots.length === 0) {
      setRuntimeTakeoverState('native');
      return { success: true, state: 'native', recovered: false };
    }

    const restored = restoreNativeShell('startup');
    return {
      ...restored,
      recovered: true,
    };
  }

  return {
    configurePaths,
    writeLauncherScript,
    writeLauncherState,
    clearLauncherState,
    loadSettings,
    saveSettings,
    normalizeSettings,
    armTakeover,
    restoreNativeShell,
    recoverOnStartup,
    getRuntimeTakeoverState,
    setRuntimeTakeoverState,
  };
}

module.exports = {
  EXPLORER_SETTINGS_DEFAULTS,
  createExplorerShellManager,
};
