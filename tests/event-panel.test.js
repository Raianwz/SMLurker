const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/window/panelConsole.js'), 'utf8');

function createPanel() {
    const handlers = new Map();
    const elements = new Map();
    const sent = [];
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
                clientHeight: 0,
                addEventListener(event, handler) { this[event] = handler; },
                classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); }, contains: (name) => classes.has(name) },
                setAttribute(name, value) { this[name] = value; },
            });
        }
        return elements.get(selector);
    };
    const context = {
        require(id) {
            if (id === 'electron') return { ipcRenderer: {
                on: (event, handler) => handlers.set(event, handler),
                send: (...args) => sent.push(args),
            } };
            if (id === '@electron/remote') return { getCurrentWindow: () => panelWindow };
            if (id === '../helpers/eventHistoryLimit') return require('../src/components/helpers/eventHistoryLimit');
            throw new Error(`Unexpected module: ${id}`);
        },
        document: { querySelector: element },
        window: { addEventListener() {} },
        module: { exports: {} },
    };
    vm.runInNewContext(source, context);
    context.module.exports.consolePnListiner();
    return { element, handlers, windowActions, sent };
}

test('event panel shows an empty state until an event arrives and after clearing', () => {
    const { element, handlers, sent } = createPanel();
    const empty = element('#panelEmpty');
    const log = element('#txtPanel');

    assert.equal(empty.hidden, false);
    handlers.get('updateConsole')(null, 'An event arrived');
    assert.equal(log.value, 'An event arrived');
    assert.equal(empty.hidden, true);

    element('button[name=cn_clear]').click();
    assert.equal(log.value, '');
    assert.equal(empty.hidden, false);
    assert.equal(element('#txtTotal').innerText, 'Caracteres: 0/6000');
    assert.deepEqual(sent, [['sendtoCleanConsole']]);
});

test('character counter measures the displayed text including numbers and emojis', () => {
    const { element, handlers } = createPanel();
    handlers.get('updateConsole')(null, 'Canal #1 🔴');
    assert.equal(element('#txtTotal').innerText, `Caracteres: ${element('#txtPanel').value.length}/6000`);
});

test('automatic clearing explains the limit while manual clearing restores the usual empty state', () => {
    const { element, handlers } = createPanel();
    handlers.get('updateCleanConsole')(null, 'limit');
    assert.equal(element('#panelEmptyTitle').textContent, 'Histórico limpo automaticamente');
    assert.match(element('#panelEmptyDescription').textContent, /6\.000 caracteres/);
    element('button[name=cn_clear]').click();
    assert.equal(element('#panelEmptyTitle').textContent, 'Nenhum evento por enquanto');
});

test('incoming events do not interrupt someone reading earlier entries', () => {
    const { element, handlers } = createPanel();
    const log = element('#txtPanel');
    log.scrollHeight = 1000;
    log.clientHeight = 200;
    log.scrollTop = 100;
    handlers.get('updateConsole')(null, 'New event');
    assert.equal(log.scrollTop, 100);

    log.scrollTop = 790;
    handlers.get('updateConsole')(null, 'Another event');
    assert.equal(log.scrollTop, 1000);
});

test('filters show only their event category without changing the stored character count', () => {
    const { element, handlers } = createPanel();
    handlers.get('updateConsole')(null, 'System log', undefined);
    handlers.get('updateConsole')(null, 'Joined #channel', 'connections');
    handlers.get('updateMentionsConsole')(null, 'Mention received');

    element('[data-event-filter="subgifts"]').click();
    assert.equal(element('#txtPanel').value, '');
    assert.equal(element('#panelEmptyTitle').textContent, 'Nada nesta categoria ainda');
    handlers.get('updateSubGiftsConsole')(null, 'Gift received');
    assert.equal(element('#txtPanel').value, 'Gift received');
    assert.equal(element('#sgTotal').innerText, 'SubGifts: 1');
    assert.equal(element('#mnTotal').innerText, 'Menções: 1');
    assert.equal(element('[data-event-filter="subgifts"]')['aria-pressed'], 'true');

    element('[data-event-filter="connections"]').click();
    assert.equal(element('#txtPanel').value, 'Joined #channel');
    element('[data-event-filter="logs"]').click();
    assert.equal(element('#txtPanel').value, 'System log');
    element('[data-event-filter="mentions"]').click();
    assert.equal(element('#txtPanel').value, 'Mention received');
    element('[data-event-filter="all"]').click();
    assert.equal(element('#txtPanel').value, 'System logJoined #channelMention receivedGift received');
    const allText = 'System logJoined #channelMention receivedGift received';
    assert.equal(element('#txtTotal').innerText, `Caracteres: ${allText.length}/6000`);
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
