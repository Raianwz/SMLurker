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
    const element = (selector) => {
        if (!elements.has(selector)) elements.set(selector, {
            value: '', textContent: '', disabled: false,
            handlers: {},
            classList: { add() {}, remove() {} },
            setAttribute() {},
            addEventListener(name, listener) { this.handlers[name] = listener; },
            focus() {},
        });
        return elements.get(selector);
    };
    const appcore = {
        sc: { tmi: {
            channels: () => initialChannels,
            join: async () => { joinCalls++; if (joinError) throw joinError; },
            part: async () => { if (partError) throw partError; },
        } },
        ipc: { send: (...args) => sent.push(args) },
        helpers: { sleep: async () => {} },
    };
    const context = {
        module: { exports: {} },
        document: { querySelector: element },
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
    };
}

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

test('quick connection logs failures without changing the connected-channel count', async () => {
    const flow = createQuickConnection();
    flow.failJoin(new Error('msg_channel_suspended'));
    flow.element('#txtConexaoCanal').value = 'falhou';
    await flow.element('#jc_Join').handlers.click();
    assert.match(flow.sent.at(-1)[1], /falha ao entrar em #falhou \(canal suspenso\)/);
    assert.equal(flow.sent.some(([name]) => name === 'sendChannelstoConsole'), false);

    flow.failPart(new Error('offline'));
    flow.element('#txtConexaoCanal').value = 'existing';
    await flow.element('#jc_Part').handlers.click();
    assert.match(flow.sent.at(-1)[1], /falha ao sair de #existing/);
    assert.equal(flow.sent.some(([name]) => name === 'sendChannelstoConsole'), false);
});
