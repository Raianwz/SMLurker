const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const STARTUP_NAME = 'SMLurker';

function startupExecutable({ isPackaged, platform = process.platform, env = process.env, execPath = process.execPath }) {
  if (platform !== 'win32' || !isPackaged) return null;
  const portablePath = env.PORTABLE_EXECUTABLE_FILE;
  if (portablePath) return path.win32.isAbsolute(portablePath) ? path.win32.normalize(portablePath) : null;
  return execPath;
}

function startupSettings(executable) {
  return { name: STARTUP_NAME, path: executable };
}

function getStartupState(app, executable) {
  if (!executable) return { available: false, enabled: false };
  const state = app.getLoginItemSettings({ path: executable });
  return { available: true, enabled: Boolean(state.openAtLogin && state.executableWillLaunchAtLogin) };
}

function setStartupState(app, executable, enabled) {
  if (!executable || typeof enabled !== 'boolean') throw new Error('Inicialização automática indisponível.');
  app.setLoginItemSettings({ ...startupSettings(executable), openAtLogin: enabled, enabled });
  return getStartupState(app, executable);
}

function isInsideDirectory(directory, candidate) {
  const relative = path.win32.relative(directory, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.win32.sep}`) && !path.win32.isAbsolute(relative);
}

function repairTemporaryStartup(app, {
  platform = process.platform,
  env = process.env,
  execPath = process.execPath,
  tempDir = os.tmpdir(),
  readFileSync = fs.readFileSync,
} = {}) {
  const executable = startupExecutable({ isPackaged: app.isPackaged, platform, env, execPath });
  if (!executable) return false;

  let saved;
  try {
    saved = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'Config', 'configs.json'), 'utf8'));
  } catch {
    return false;
  }
  if (saved.ini !== true) return false;

  const items = app.getLoginItemSettings({ path: executable }).launchItems || [];
  const previous = items.find((item) => item.name === STARTUP_NAME && item.scope === 'user');
  if (!previous || !previous.path || !isInsideDirectory(tempDir, previous.path)) return false;
  if (path.win32.normalize(previous.path).toLowerCase() === path.win32.normalize(executable).toLowerCase()) return false;

  app.setLoginItemSettings({ ...startupSettings(executable), openAtLogin: true, enabled: previous.enabled !== false });
  return true;
}

module.exports = { STARTUP_NAME, startupExecutable, getStartupState, setStartupState, repairTemporaryStartup };
