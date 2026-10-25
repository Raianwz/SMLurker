const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startupExecutable,
  getStartupState,
  setStartupState,
  repairTemporaryStartup,
} = require('../src/components/helpers/startupLogin');

test('portable startup uses its persistent launcher instead of the extracted executable', () => {
  const options = {
    isPackaged: true,
    platform: 'win32',
    execPath: 'C:\\Users\\Raian\\AppData\\Local\\Temp\\extract\\SMLurker.exe',
    env: { PORTABLE_EXECUTABLE_FILE: 'C:\\Apps\\SMLurker.Portable.0.1.14.exe' },
  };
  assert.equal(startupExecutable(options), options.env.PORTABLE_EXECUTABLE_FILE);
  assert.equal(startupExecutable({ ...options, env: {} }), options.execPath);
  assert.equal(startupExecutable({ ...options, isPackaged: false }), null);
  assert.equal(startupExecutable({ ...options, env: { PORTABLE_EXECUTABLE_FILE: 'relative.exe' } }), null);
});

test('startup registration keeps a stable name and reports whether Windows will launch it', () => {
  const calls = [];
  let state = { openAtLogin: false, executableWillLaunchAtLogin: false };
  const app = {
    setLoginItemSettings(settings) {
      calls.push(settings);
      state = { openAtLogin: settings.openAtLogin, executableWillLaunchAtLogin: settings.openAtLogin && settings.enabled };
    },
    getLoginItemSettings() { return state; },
  };
  const executable = 'C:\\Apps\\SMLurker.Portable.0.1.14.exe';
  assert.deepEqual(setStartupState(app, executable, true), { available: true, enabled: true });
  assert.deepEqual(calls[0], { name: 'SMLurker', path: executable, openAtLogin: true, enabled: true });
  assert.deepEqual(getStartupState(app, executable), { available: true, enabled: true });
  assert.deepEqual(setStartupState(app, executable, false), { available: true, enabled: false });
});

test('an old temporary startup entry is repaired without re-enabling a Windows-disabled entry', () => {
  const calls = [];
  const app = {
    isPackaged: true,
    getPath() { return 'C:\\Users\\Raian\\AppData\\Roaming\\SMLurker'; },
    getLoginItemSettings() {
      return { launchItems: [{
        name: 'SMLurker',
        scope: 'user',
        path: 'C:\\Users\\Raian\\AppData\\Local\\Temp\\extract\\SMLurker.exe',
        enabled: false,
      }] };
    },
    setLoginItemSettings(settings) { calls.push(settings); },
  };
  const repaired = repairTemporaryStartup(app, {
    platform: 'win32',
    env: { PORTABLE_EXECUTABLE_FILE: 'C:\\Apps\\SMLurker.Portable.0.1.14.exe' },
    execPath: 'C:\\Users\\Raian\\AppData\\Local\\Temp\\extract\\SMLurker.exe',
    tempDir: 'C:\\Users\\Raian\\AppData\\Local\\Temp',
    readFileSync: () => JSON.stringify({ ini: true }),
  });
  assert.equal(repaired, true);
  assert.deepEqual(calls, [{
    name: 'SMLurker',
    path: 'C:\\Apps\\SMLurker.Portable.0.1.14.exe',
    openAtLogin: true,
    enabled: false,
  }]);
});
