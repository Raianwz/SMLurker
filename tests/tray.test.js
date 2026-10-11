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
    let dialogAnswer = 0;
    let tray;
    const win = {
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
                dialog: { showMessageBoxSync: (options) => {
                    calls.push(options);
                    return dialogAnswer;
                } },
                ipcMain,
                nativeImage: { createFromPath() {} },
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
        win,
        choose: (label) => tray.menu.items.find((item) => item.label === label).click(),
        answer: (value) => { dialogAnswer = value; },
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

test('restart from tray only happens after confirmation', () => {
    const fixture = setupTray();
    fixture.choose('Reiniciar');
    assert.deepEqual(Array.from(fixture.calls[0].buttons), ['Não', 'Sim']);
    assert.equal(fixture.calls[0].cancelId, 0);
    assert.equal(fixture.calls.length, 1);
    fixture.answer(1);
    fixture.choose('Reiniciar');
    assert.deepEqual(fixture.calls.slice(2), ['relaunch', 'quit']);
});
