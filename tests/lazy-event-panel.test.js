const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(path.join(__dirname, '../src/components/clog.js'), 'utf8');

function createApp() {
    const ipcMain = new EventEmitter();
    const windows = [];
    class FakeWindow extends EventEmitter {
        constructor() {
            super();
            this.webContents = new EventEmitter();
            this.sent = [];
            this.webContents.send = (...args) => this.sent.push(args);
            this.webContents.executeJavaScript = async () => {};
            this.destroyed = false;
            this.visible = false;
            windows.push(this);
        }
        loadFile() {}
        isDestroyed() { return this.destroyed; }
        show() { this.visible = true; }
        hide() { this.visible = false; }
        close() {
            const event = { preventDefault() {} };
            this.emit('close', event);
        }
        destroy() { this.destroyed = true; this.emit('closed'); }
    }
    vm.runInNewContext(source, {
        module: { exports: {} },
        require(id) {
            if (id === 'electron') return { ipcMain, BrowserWindow: FakeWindow, shell: { openExternal() {} } };
            if (id === '@electron/remote/main') return { initialize() {}, enable() {} };
            if (id === 'path') return path;
            throw new Error(`Unexpected import: ${id}`);
        },
        __dirname: path.join(__dirname, '../src/components'),
    });
    return { ipcMain, windows };
}

test('event panel is created on demand and replays events received while closed', async () => {
    const app = createApp();
    assert.equal(app.windows.length, 0);
    app.ipcMain.emit('sendtoConsole', null, 'Connected');
    app.ipcMain.emit('sendMentionstoConsole', null, 'Mention');
    app.ipcMain.emit('sendChannelstoConsole', null, 3);
    assert.equal(app.windows.length, 0);

    app.ipcMain.emit('openConsole');
    assert.equal(app.windows.length, 1);
    app.windows[0].webContents.emit('did-finish-load');
    await new Promise(setImmediate);
    assert.deepEqual(JSON.parse(JSON.stringify(app.windows[0].sent)), [
        ['updateChannelsConsole', 3],
        ['updateConsole', 'Connected'],
        ['updateMentionsConsole', 'Mention'],
    ]);
    assert.equal(app.windows[0].visible, true);
    app.windows[0].close();
    assert.equal(app.windows[0].visible, false);
    app.ipcMain.emit('openConsole');
    assert.equal(app.windows.length, 1);
    assert.equal(app.windows[0].visible, true);

    app.ipcMain.emit('closeConsole');
    assert.equal(app.windows[0].destroyed, true);
    app.ipcMain.emit('sendtoConsole', null, 'Reconnected');
    app.ipcMain.emit('openConsole');
    assert.equal(app.windows.length, 2);
    app.windows[1].webContents.emit('did-finish-load');
    await new Promise(setImmediate);
    assert.deepEqual(Array.from(app.windows[1].sent, ([event]) => event), [
        'updateChannelsConsole', 'updateConsole', 'updateMentionsConsole', 'updateConsole',
    ]);
});

test('clearing events also clears the history replayed on first open', async () => {
    const app = createApp();
    app.ipcMain.emit('sendtoConsole', null, 'Old event');
    app.ipcMain.emit('sendtoCleanConsole');
    app.ipcMain.emit('openConsole');
    app.windows[0].webContents.emit('did-finish-load');
    await new Promise(setImmediate);
    assert.deepEqual(JSON.parse(JSON.stringify(app.windows[0].sent)), [['updateChannelsConsole', 0]]);
});
