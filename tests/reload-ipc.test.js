const test = require('node:test');
const assert = require('node:assert/strict');
const { registerReloadIpc, attachReloadShortcut } = require('../src/components/ipc/reload');

test('Ctrl+R requests confirmation instead of reloading immediately', () => {
    const listeners = new Map();
    const sent = [];
    const window = { webContents: {
        on: (name, listener) => listeners.set(name, listener),
        send: (...args) => sent.push(args),
    } };
    attachReloadShortcut(window);
    let prevented = false;
    listeners.get('before-input-event')({ preventDefault: () => { prevented = true; } }, {
        type: 'keyDown', key: 'r', control: true, shift: false, alt: false,
    });
    assert.equal(prevented, true);
    assert.deepEqual(sent, [['app-reload:requested', 'reload']]);
});

test('only the main window can request or perform reload and restart', () => {
    const listeners = new Map();
    const calls = [];
    const webContents = {
        send: (...args) => calls.push(args),
        reload: () => calls.push('reload'),
    };
    const app = {
        relaunch: () => calls.push('relaunch'),
        quit: () => calls.push('quit'),
    };
    registerReloadIpc({
        app,
        ipcMain: { on: (name, listener) => listeners.set(name, listener) },
        getMainWindow: () => ({ webContents }),
    });
    for (const name of ['app-reload:request', 'app-restart:request', 'app-reload:perform']) {
        listeners.get(name)({ sender: {} }, 'restart');
    }
    assert.deepEqual(calls, []);
    listeners.get('app-reload:request')({ sender: webContents });
    listeners.get('app-restart:request')({ sender: webContents });
    listeners.get('app-reload:perform')({ sender: webContents }, 'reload');
    listeners.get('app-reload:perform')({ sender: webContents }, 'restart');
    assert.deepEqual(calls, [
        ['app-reload:requested', 'reload'],
        ['app-reload:requested', 'restart'],
        'reload', 'relaunch', 'quit',
    ]);
});
