const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controlsSource = fs.readFileSync(path.join(__dirname, '../src/internal/controls.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../src/app/index.html'), 'utf8');

function setupControls(answer) {
    const calls = [];
    const elements = new Map();
    const element = (selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, {
                innerText: '',
                addEventListener(name, listener) { this[name] = listener; },
            });
        }
        return elements.get(selector);
    };
    let menu;
    let domReady;
    const api = {
        reload: {
            request: () => calls.push('request-reload'),
            requestRestart: () => calls.push('request-restart'),
        },
        cr: {
            appr: {
                getVersion: () => '0.1.14',
                relaunch: () => calls.push('relaunch'),
                quit: () => calls.push('quit'),
            },
            dg: { showMB: (options) => { calls.push(options); return answer; } },
            wb: {
                close: () => calls.push('close'),
                hide: () => calls.push('hide'),
                minimize: () => calls.push('minimize'),
            },
            clipmenu: { show: (value) => { menu = value; } },
            ipc: { send() {}, emit() {} },
            eshell: { openExternal() {} },
        },
        tray: { export: () => calls.push('tray-notice') },
    };
    const browser = vm.createContext({
        api,
        document: { querySelector: element },
        window: { addEventListener() {} },
    });
    const win = {
        getTitle: () => 'SM Lurker',
        webContents: {
            on: (_name, listener) => { domReady = listener; },
            executeJavaScript: (code) => vm.runInContext(code, browser),
        },
    };
    const controls = { module: { exports: {} }, require: () => ({ WMenubar() {} }) };
    vm.runInNewContext(controlsSource, controls);
    controls.module.exports.WControls(() => win);
    domReady();
    return { calls, element, getMenu: () => menu };
}

test('main titlebar has accessible buttons for tray, minimize and exit', () => {
    for (const [name, label] of [
        ['hideWindow', 'Ocultar na bandeja'],
        ['minWindow', 'Minimizar'],
        ['closeWindow', 'Fechar e sair'],
    ]) {
        assert.match(html, new RegExp(`<button name="${name}"[^>]*aria-label="${label}"`));
    }
    const { calls, element } = setupControls(0);
    element('button[name=hideWindow]').click();
    element('button[name=minWindow]').click();
    element('button[name=closeWindow]').click();
    assert.deepEqual(calls, ['hide', 'tray-notice', 'minimize', 'close']);
});

test('reload and restart menu items request the guarded actions', () => {
    const controls = setupControls(0);
    controls.element('#refresh').click();
    const reload = controls.getMenu().find((item) => item.label === 'Recarregar');
    const restart = controls.getMenu().find((item) => item.label === 'Reiniciar');
    assert.equal(reload.role, undefined);
    reload.click();
    restart.click();
    assert.deepEqual(controls.calls, ['request-reload', 'request-restart']);
});
