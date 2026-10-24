const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/joinPart.js'), 'utf8');

function createQuickConnection(initialChannels = ['#existing']) {
    const elements = new Map();
    const sent = [];
    let joinError = null;
    let partError = null;
    let joinCalls = 0;
    const partCalls = [];
    let listenerCount = 0;
    const createElement = () => ({
        value: '', textContent: '', disabled: false, open: false, children: [],
        handlers: {},
        classList: { add() {}, remove() {} },
        setAttribute() {},
        addEventListener(name, listener) { this.handlers[name] = listener; listenerCount++; },
        append(...children) { this.children.push(...children); },
        appendChild(child) { this.children.push(child); },
        replaceChildren(...children) { this.children = children; },
        showModal() { this.open = true; },
        close() { this.open = false; },
        focus() {},
    });
    const element = (selector) => {
        if (!elements.has(selector)) elements.set(selector, createElement());
        return elements.get(selector);
    };
    const appcore = {
        sc: { tmi: {
            channels: () => initialChannels,
            join: async (channel) => { joinCalls++; if (joinError) throw joinError; initialChannels.push(`#${channel}`); },
            part: async (channel) => { partCalls.push(channel); if (partError) throw partError; initialChannels = initialChannels.filter(name => name !== `#${channel}`); },
        } },
        ipc: { send: (...args) => sent.push(args) },
        helpers: { sleep: async () => {} },
    };
    const context = {
        module: { exports: {} },
        document: { querySelector: element, createElement },
        setTimeout: () => 1, clearTimeout() {},
        localStorage: { getItem: () => null, setItem() {} },
        require(id) {
            if (id === '../../internal/appcore') return { appcore };
            if (id === '../window/console') return { jcPanel() {}, jcPNReset() {} };
            if (id === './joinFailure') return require('../src/components/twitch/joinFailure');
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    context.module.exports.joinpart();
    return {
        element, sent,
        failJoin: (error) => { joinError = error; },
        failPart: (error) => { partError = error; },
        getJoinCalls: () => joinCalls,
        partCalls,
        reconnect: (channels) => { initialChannels = channels; context.module.exports.joinpart(); },
        getListenerCount: () => listenerCount,
    };
}

test('quick connection reuses its buttons and refreshes the channel count on reconnect', async () => {
    const flow = createQuickConnection(['#old']);
    const initialListeners = flow.getListenerCount();
    flow.reconnect(['#new', '#other']);
    assert.equal(flow.getListenerCount(), initialListeners);
    flow.element('#txtConexaoCanal').value = 'third';
    await flow.element('#jc_Join').handlers.click();
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 3');
    assert.equal(flow.getJoinCalls(), 1);
});

test('quick connection logs successful joins and parts in the event panel', async () => {
    const flow = createQuickConnection();
    flow.element('#txtConexaoCanal').value = 'novo';
    await flow.element('#jc_Join').handlers.click();
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 2');
    assert.match(flow.sent.find(([name]) => name === 'sendtoConsole')[1], /entrou em #novo/);

    flow.element('#txtConexaoCanal').value = 'existing';
    await flow.element('#jc_Part').handlers.click();
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 1');
    assert.match(flow.sent.filter(([name]) => name === 'sendtoConsole').at(-1)[1], /saiu de #existing/);
});

test('quick connection refuses a new channel when 100 are already connected', async () => {
    const flow = createQuickConnection(Array.from({ length: 100 }, (_, index) => `#channel${index}`));
    flow.element('#txtConexaoCanal').value = 'extra';
    await flow.element('#jc_Join').handlers.click();
    assert.equal(flow.getJoinCalls(), 0);
    assert.match(flow.element('#jc_Status').textContent, /Limite de 100 canais/);
    assert.match(flow.sent.at(-1)[1], /limite de 100 canais conectados/);
});

test('connected-channel picker frees a slot without changing the saved list or typed channel', async () => {
    const flow = createQuickConnection(Array.from({ length: 100 }, (_, index) => `#channel${index}`));
    flow.element('#txtConexaoCanal').value = 'extra';
    flow.element('#jc_ShowConnected').handlers.click();
    assert.equal(flow.element('#jc_ConnectedDialog').open, true);
    assert.equal(flow.element('#jc_ConnectedList').children.length, 100);

    flow.element('#jc_ConnectedSearch').value = 'channel42';
    flow.element('#jc_ConnectedSearch').handlers.input();
    const row = flow.element('#jc_ConnectedList').children[0];
    assert.equal(row.children[0].textContent, '#channel42');
    await row.children[1].handlers.click();

    assert.deepEqual(flow.partCalls, ['channel42']);
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 99');
    assert.equal(flow.element('#txtConexaoCanal').value, 'extra');
    assert.match(flow.element('#jc_ConnectedStatus').textContent, /lista salva não foi alterada/);
    await flow.element('#jc_Join').handlers.click();
    assert.equal(flow.getJoinCalls(), 1);
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 100');
});

test('connected-channel picker keeps a channel visible when leaving fails', async () => {
    const flow = createQuickConnection(['#existing']);
    flow.failPart(new Error('offline'));
    flow.element('#jc_ShowConnected').handlers.click();
    await flow.element('#jc_ConnectedList').children[0].children[1].handlers.click();
    assert.equal(flow.element('#cntotal').textContent, 'Canais: 1');
    assert.equal(flow.element('#jc_ConnectedList').children[0].children[0].textContent, '#existing');
    assert.match(flow.element('#jc_ConnectedStatus').textContent, /Não foi possível sair/);
});

test('quick connection logs failures without changing the connected-channel count', async () => {
    const flow = createQuickConnection();
    flow.failJoin(new Error('msg_channel_suspended'));
    flow.element('#txtConexaoCanal').value = 'falhou';
    await flow.element('#jc_Join').handlers.click();
    assert.match(flow.sent.at(-1)[1], /falha ao entrar em #falhou \(canal suspenso ou removido\)/);
    assert.equal(flow.sent.at(-1)[2], 'connections');
    assert.equal(flow.sent.some(([name]) => name === 'sendChannelstoConsole'), false);

    flow.failPart(new Error('offline'));
    flow.element('#txtConexaoCanal').value = 'existing';
    await flow.element('#jc_Part').handlers.click();
    assert.match(flow.sent.at(-1)[1], /falha ao sair de #existing/);
    assert.equal(flow.sent.some(([name]) => name === 'sendChannelstoConsole'), false);
});
