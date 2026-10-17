const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/ipc/configWindow.js'), 'utf8');

test('only settings can change the visual and open windows receive the update', () => {
    const handlers = new Map();
    const listeners = new Map();
    const sent = [];
    let appearance = 'modern';
    let settingsWindow;
    const mainWindow = { webContents: { send: (...args) => sent.push(['main', ...args]) }, isDestroyed: () => false };
    const fakeElectron = {
        app: {},
        ipcMain: {
            handle: (channel, handler) => handlers.set(channel, handler),
            on: (channel, handler) => listeners.set(channel, handler),
        },
        BrowserWindow: class {
            constructor() {
                this.webContents = {
                    send: (...args) => sent.push(['settings', ...args]),
                    on() {},
                };
                settingsWindow = this;
            }
            loadFile() {}
            once() {}
            on() {}
            isDestroyed() { return false; }
            static fromWebContents(sender) {
                return [mainWindow, settingsWindow].find((window) => window?.webContents === sender);
            }
            static getAllWindows() { return [mainWindow, settingsWindow]; }
        },
        shell: {},
    };
    vm.runInNewContext(source, {
        require(id) {
            if (id === 'electron') return fakeElectron;
            if (id === '@electron/remote/main') return { initialize() {}, enable() {} };
            if (id === '../helpers/localData') return {
                createLocalData: () => ({ preferences: {
                    get: () => ({ appearance }),
                    updateAppearance: (value) => ({ appearance: (appearance = value) }),
                } }),
            };
            throw new Error(`Unexpected module: ${id}`);
        },
    });

    listeners.get('openConfigs')();
    assert.equal(handlers.get('appearance:get')({ sender: mainWindow.webContents }), 'modern');
    assert.throws(() => handlers.get('appearance:get')({ sender: {} }), /não autorizada/);
    assert.throws(() => handlers.get('appearance:set')({ sender: mainWindow.webContents }, 'classic'), /não autorizada/);
    assert.equal(appearance, 'modern');

    assert.equal(handlers.get('appearance:set')({ sender: settingsWindow.webContents }, 'classic'), 'classic');
    assert.equal(appearance, 'classic');
    assert.deepEqual(sent, [
        ['main', 'appearance:changed', 'classic'],
        ['settings', 'appearance:changed', 'classic'],
    ]);
});
