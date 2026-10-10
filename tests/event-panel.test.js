const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/window/panelConsole.js'), 'utf8');

function createPanel() {
    const handlers = new Map();
    const elements = new Map();
    let maximized = false;
    const windowActions = [];
    const panelWindow = {
        isMaximized: () => maximized,
        minimize: () => windowActions.push('minimize'),
        maximize: () => { maximized = true; windowActions.push('maximize'); },
        unmaximize: () => { maximized = false; windowActions.push('unmaximize'); },
        close: () => windowActions.push('close'),
        on() {},
    };
    const element = (selector) => {
        if (!elements.has(selector)) {
            const classes = new Set();
            elements.set(selector, {
                value: '',
                innerText: '',
                hidden: false,
                scrollHeight: 0,
                scrollTop: 0,
                addEventListener(event, handler) { this[event] = handler; },
                classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); }, contains: (name) => classes.has(name) },
                setAttribute(name, value) { this[name] = value; },
            });
        }
        return elements.get(selector);
    };
    const context = {
        require(id) {
            if (id === 'electron') return { ipcRenderer: { on: (event, handler) => handlers.set(event, handler) } };
            if (id === '@electron/remote') return { getCurrentWindow: () => panelWindow };
            if (id === '../../internal/appcore') return { appcore: { dg: { showMB() {} } } };
            throw new Error(`Unexpected module: ${id}`);
        },
        document: { querySelector: element },
        window: { addEventListener() {} },
        module: { exports: {} },
    };
    vm.runInNewContext(source, context);
    context.module.exports.consolePnListiner();
    return { element, handlers, windowActions };
}

test('event panel shows an empty state until an event arrives and after clearing', () => {
    const { element, handlers } = createPanel();
    const empty = element('#panelEmpty');
    const log = element('#txtPanel');

    assert.equal(empty.hidden, false);
    handlers.get('updateConsole')(null, 'An event arrived');
    assert.equal(log.value, 'An event arrived');
    assert.equal(empty.hidden, true);

    element('button[name=cn_clear]').click();
    assert.equal(log.value, '');
    assert.equal(empty.hidden, false);
    assert.equal(element('#txtTotal').innerText, 'Texto: 0/6000');
});

test('event panel keeps channel and mention counters working', () => {
    const { element, handlers } = createPanel();

    handlers.get('updateChannelsConsole')(null, 3);
    handlers.get('updateMentionsConsole')(null, 'Mention received');
    assert.equal(element('#cnTotal').innerText, 'Canais: 3');
    assert.equal(element('#mnTotal').innerText, 'Menções: 1');

    handlers.get('updateCleanConsole')();
    assert.equal(element('#mnTotal').innerText, 'Menções: 0');
    assert.equal(element('#panelEmpty').hidden, false);
});

test('window controls minimize, toggle maximize and close the event panel', () => {
    const { element, windowActions } = createPanel();
    const maximize = element('#panelMaximize');

    element('#panelMinimize').click();
    maximize.click();
    assert.equal(maximize.classList.contains('is-maximized'), true);
    assert.equal(maximize['aria-label'], 'Restaurar');
    maximize.click();
    assert.equal(maximize.classList.contains('is-maximized'), false);
    element('#panelClose').click();

    assert.deepEqual(windowActions, ['minimize', 'maximize', 'unmaximize', 'close']);
});
