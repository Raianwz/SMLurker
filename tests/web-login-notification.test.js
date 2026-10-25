const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(path.join(__dirname, '../src/components/ipc/webLogin.js'), 'utf8');

function createController() {
    const handlers = new Map();
    const ipcMain = new EventEmitter();
    ipcMain.handle = (name, handler) => handlers.set(name, handler);
    const notifications = [];
    const windowActions = [];
    let loginStarts = 0;
    let onResult;
    class Notification extends EventEmitter {
        static isSupported() { return true; }
        constructor(options) {
            super();
            this.options = options;
            notifications.push(this);
        }
        show() {}
    }
    const window = {
        isDestroyed: () => false,
        isMinimized: () => false,
        show: () => windowActions.push('show'),
        focus: () => windowActions.push('focus'),
        webContents: {
            isLoadingMainFrame: () => false,
            send: () => {},
        },
    };
    const context = {
        module: { exports: {} },
        require(id) {
            if (id === 'node:path') return path;
            if (id === '../twitch/webLogin') return { createWebLogin: (options) => {
                onResult = options.onResult;
                return {
                    start: async () => { loginStarts++; },
                    handleCallback: async () => {},
                };
            } };
            if (id === '../twitch/webSession') return { createWebSession: () => ({
                restore: async () => ({ type: 'error', requiresLogin: true, message: 'Sessão expirada.' }),
                save: () => true,
                clear: () => {},
            }) };
            throw new Error(`Unexpected import: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    context.module.exports.createWebLoginController({
        app: { getPath: () => 'test-config', isPackaged: false },
        ipcMain,
        shell: { openExternal: async () => {} },
        Notification,
        safeStorage: {},
        getMainWindow: () => window,
        fromMainWindow: () => {},
    });
    return { handlers, notifications, windowActions, getStarts: () => loginStarts,
        completeLogin: () => onResult({ type: 'success', username: 'raianwz', accessToken: 'valid-token' }) };
}

test('first notification click starts Web login; later clicks only focus the app', async () => {
    const app = createController();
    await app.handlers.get('web-login:restore')();
    assert.equal(app.notifications.length, 1);
    assert.match(app.notifications[0].options.body, /Clique para entrar/);

    app.notifications[0].emit('click');
    app.notifications[0].emit('click');
    await new Promise(setImmediate);
    assert.equal(app.getStarts(), 1);
    assert.equal(app.windowActions.filter((action) => action === 'focus').length, 3);
});

test('the button and notification share login start; an old notice cannot start a later login', async () => {
    const app = createController();
    await app.handlers.get('web-login:restore')();
    await app.handlers.get('web-login:start')();
    app.notifications[0].emit('click');
    assert.equal(app.getStarts(), 1);

    app.completeLogin();
    app.handlers.get('web-login:invalid')();
    assert.equal(app.notifications.length, 2);
    app.notifications[0].emit('click');
    assert.equal(app.getStarts(), 1);
    app.notifications[1].emit('click');
    await new Promise(setImmediate);
    assert.equal(app.getStarts(), 2);
});
