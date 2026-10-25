const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/helpers/tray.js'), 'utf8');

function setupTray() {
    const calls = [];
    const listeners = new Map();
    const on = (name, listener) => {
        const registered = listeners.get(name) ?? [];
        registered.push(listener);
        listeners.set(name, registered);
    };
    const emit = (name, ...args) => (listeners.get(name) ?? []).forEach((listener) => listener(...args));
    let visible = true;
    let minimized = false;
    let tray;
    let imageLoads = 0;
    const headerImage = { isEmpty: () => false };
    const win = {
        webContents: { send: (...args) => calls.push(args) },
        isDestroyed: () => false,
        isVisible: () => visible,
        isMinimized: () => minimized,
        on,
        hide() { visible = false; calls.push('hide'); emit('hide'); },
        show() { visible = true; calls.push('show'); emit('show'); },
        restore() { minimized = false; calls.push('restore'); emit('restore'); },
        focus() { calls.push('focus'); },
        minimize() { minimized = true; calls.push('minimize'); emit('minimize'); },
    };
    class FakeTray {
        constructor() { tray = this; }
        on(name, listener) { this[name] = listener; }
        setIgnoreDoubleClickEvents() {}
        setToolTip(value) { this.tooltip = value; }
        setContextMenu(value) { this.menu = value; }
    }
    const ipcMain = { on, emit };
    const app = {
        getPath: () => 'userData',
        relaunch: () => calls.push('relaunch'),
        quit: () => calls.push('quit'),
    };
    const context = {
        module: { exports: {} },
        require(id) {
            if (id === 'fs') return { existsSync: () => false };
            if (id === './assets') return { assetPath: (_app, name) => name };
            if (id === 'electron') return {
                Menu: { buildFromTemplate: (items) => ({ items }) },
                Tray: FakeTray,
                ipcMain,
                nativeImage: { createFromPath() { imageLoads++; return headerImage; } },
            };
            throw new Error(`Unexpected import: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    context.module.exports.SetUpTray(app, win);
    return {
        calls,
        emit,
        tray: () => tray,
        imageLoads: () => imageLoads,
        headerImage,
        win,
        choose: (label) => tray.menu.items.find((item) => item.label === label).click(),
    };
}

test('tray opens, focuses and restores the window instead of hiding a minimized one', () => {
    const fixture = setupTray();
    fixture.choose('Ocultar na bandeja');
    assert.deepEqual(fixture.calls, ['hide']);
    assert.ok(fixture.tray().menu.items.some((item) => item.label === 'Abrir SMLurker'));
    fixture.choose('Abrir SMLurker');
    assert.deepEqual(fixture.calls.slice(1), ['show', 'focus']);

    fixture.win.minimize();
    assert.ok(fixture.tray().menu.items.some((item) => item.label === 'Abrir SMLurker'));
    fixture.choose('Abrir SMLurker');
    assert.deepEqual(fixture.calls.slice(-3), ['restore', 'show', 'focus']);
});

test('tray tooltip and menu reflect connection status and channel count', () => {
    const fixture = setupTray();
    assert.match(fixture.tray().tooltip, /Desconectado/);
    fixture.emit('tray:connection-status', {}, 'connecting');
    assert.match(fixture.tray().tooltip, /Conectando/);
    fixture.emit('sendChannelstoConsole', {}, 3);
    fixture.emit('tray:connection-status', {}, 'connected');
    assert.match(fixture.tray().tooltip, /Conectado · 3 canais/);
    fixture.emit('tray:connection-status', {}, 'disconnected');
    assert.match(fixture.tray().tooltip, /Desconectado/);
});

test('tray keeps its menu icon in memory across menu refreshes', () => {
    const fixture = setupTray();
    fixture.emit('tray:connection-status', {}, 'connecting');
    fixture.emit('tray:connection-status', {}, 'connected');
    assert.equal(fixture.imageLoads(), 1);
    assert.equal(fixture.tray().menu.items[0].icon, fixture.headerImage);
});

test('restart from tray uses the guarded restart flow', () => {
    const fixture = setupTray();
    fixture.choose('Reiniciar');
    assert.deepEqual(fixture.calls, [['app-reload:requested', 'restart']]);
});
