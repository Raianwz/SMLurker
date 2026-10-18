const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { remainingJoinMs, formatRemainingMs } = require('../src/components/twitch/joinEstimate');

test('join estimate counts channel pacing and only pauses between batches of 18', () => {
    assert.equal(remainingJoinMs(1), 200);
    assert.equal(remainingJoinMs(18), 3_600);
    assert.equal(remainingJoinMs(19), 14_300);
    assert.equal(remainingJoinMs(36), 17_700);
    assert.equal(remainingJoinMs(37), 28_400);
    assert.equal(remainingJoinMs(134), 100_300);
    assert.equal(remainingJoinMs(19, 17), 10_900);
    assert.equal(remainingJoinMs(19, 18), 200);
    assert.equal(remainingJoinMs(19, 19), 0);
});

test('join estimate formats remaining wall-clock time', () => {
    assert.equal(formatRemainingMs(100_300), '01m 41s');
    assert.equal(formatRemainingMs(15_001), '00m 16s');
    assert.equal(formatRemainingMs(0), '00m 00s');
});

test('waiting for IRC readiness is shown below login and cleared when channels start', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/joinchannels.js'), 'utf8');
    const elements = new Map();
    const element = (selector) => {
        if (!elements.has(selector)) elements.set(selector, {
            textContent: '', style: {}, setAttribute() {}, removeAttribute() {},
        });
        return elements.get(selector);
    };
    let resolveReady;
    const context = {
        module: { exports: {} },
        document: { querySelector: element, addEventListener() {}, removeEventListener() {} },
        window: { addEventListener() {}, removeEventListener() {} },
        setInterval: () => 1,
        clearInterval() {},
        setTimeout,
        clearTimeout,
        require(id) {
            if (id === '../../internal/smcore') return { smcore: {
                tmi: {
                    rds: () => new Promise((resolve) => { resolveReady = resolve; }),
                    join: async () => {},
                },
                lv: { get: () => 0, add() {} },
            } };
            if (id === '../../internal/appcore') return { appcore: {
                tr: { changeside() {} },
                channels: { path: () => 'channels.json', read: () => ['#raianwz'] },
                fs: { exist: () => true },
            } };
            if (id === 'electron') return { ipcRenderer: { send() {} } };
            if (id === 'node:timers/promises') return { setTimeout: async () => {} };
            if (id === './joinEstimate') return require('../src/components/twitch/joinEstimate');
            if (id === './joinFailure') return require('../src/components/twitch/joinFailure');
            if (id === './channelFailureCleanup') return require('../src/components/twitch/channelFailureCleanup');
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    const joining = context.module.exports.jc();
    assert.equal(element('#msgStatus').textContent, 'Aguardando conexão com o chat da Twitch...');
    await Promise.resolve();
    resolveReady('OPEN');
    await joining;
    assert.equal(element('#msgStatus').textContent, 'Entrando nos canais...');
});

test('join countdown catches up with elapsed time when the window regains focus', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/joinchannels.js'), 'utf8');
    const elements = new Map();
    const waits = [];
    const sent = [];
    const focusListeners = new Map();
    const documentListeners = new Map();
    const element = (selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, {
                style: {},
                textContent: '',
                disabled: false,
                attributes: new Set(),
                setAttribute(name) { this.attributes.add(name); },
                removeAttribute(name) { this.attributes.delete(name); },
            });
        }
        return elements.get(selector);
    };
    let now = 1_000;
    const context = {
        Date: class extends Date {
            constructor(...args) { super(...(args.length ? args : [now])); }
            static now() { return now; }
        },
        document: {
            hidden: false,
            querySelector: element,
            addEventListener: (name, listener) => documentListeners.set(name, listener),
            removeEventListener: (name) => documentListeners.delete(name),
        },
        window: {
            addEventListener: (name, listener) => focusListeners.set(name, listener),
            removeEventListener: (name) => focusListeners.delete(name),
        },
        setInterval: () => 1,
        clearInterval() {},
        setTimeout,
        clearTimeout,
        module: { exports: {} },
        require(id) {
            if (id === '../../internal/smcore') return { smcore: {
                tmi: { rds: async () => 'OPEN', join: async () => {} },
                lv: { get: () => 0, add() {} },
            } };
            if (id === '../../internal/appcore') return { appcore: {
                tr: { changeside() {} },
                channels: { path: () => 'channels.json', read: () => Array.from({ length: 19 }, (_, i) => `channel${i}`) },
                fs: { exist: () => true },
            } };
            if (id === 'electron') return { ipcRenderer: { send: (...args) => sent.push(args) } };
            if (id === 'node:timers/promises') return { setTimeout: (ms) => new Promise((resolve) => waits.push({ ms, resolve })) };
            if (id === './joinEstimate') return require('../src/components/twitch/joinEstimate');
            if (id === './joinFailure') return require('../src/components/twitch/joinFailure');
            if (id === './channelFailureCleanup') return require('../src/components/twitch/channelFailureCleanup');
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    let finished = false;
    const joining = context.module.exports.jc().then(() => { finished = true; });
    for (let i = 0; i < 10 && !focusListeners.has('focus'); i++) await Promise.resolve();

    assert.equal(element('#Mtimer').textContent, 'Tempo Estimado 🕘 00m 15s');
    assert.equal(element('#conection_box').attributes.has('disabled'), true);
    assert.equal(element('#swt_notifyMe').disabled, false);
    assert.equal(element('#swt_notifyGift').disabled, false);
    assert.equal(element('#volBar').disabled, false);
    now += 5_000;
    focusListeners.get('focus')();
    assert.equal(element('#Mtimer').textContent, 'Tempo Estimado 🕘 00m 10s');

    const scheduledWaits = [];
    let sawWaiting = false;
    for (let i = 0; i < 1000 && !finished; i++) {
        if (element('#cntotal').textContent.startsWith('Aguarde:')) sawWaiting = true;
        if (waits.length) {
            const wait = waits.shift();
            scheduledWaits.push(wait.ms);
            now += wait.ms;
            wait.resolve();
        }
        await Promise.resolve();
    }
    await joining;
    assert.equal(sawWaiting, true);
    assert.equal(element('#cntotal').textContent, 'Canais: 19');
    const eventEntries = sent.filter(([name]) => name === 'sendtoConsole').map(([, text]) => text);
    assert.equal(eventEntries.filter((text) => text.includes('Entraram:')).length, 2);
    assert.match(eventEntries.join(''), /channel0/);
    assert.match(eventEntries.join(''), /channel18/);
    assert.match(eventEntries.at(-1), /19 conectados, 0 falhas/);
    assert.equal(scheduledWaits.filter((ms) => ms === 10_500).length, 1);
    assert.equal(scheduledWaits.filter((ms) => ms === 200).length, 19);
    assert.equal(focusListeners.has('focus'), false);
    assert.equal(documentListeners.has('visibilitychange'), false);
    assert.equal(element('#conection_box').attributes.has('disabled'), false);
});

test('a rejected join does not count as a connected channel', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/joinchannels.js'), 'utf8');
    const elements = new Map();
    const sent = [];
    const writes = [];
    const dialogs = [];
    const element = (selector) => {
        if (!elements.has(selector)) elements.set(selector, {
            textContent: '', style: {}, attributes: {},
            setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute() {},
        });
        return elements.get(selector);
    };
    const context = {
        module: { exports: {} },
        document: { querySelector: element, addEventListener() {}, removeEventListener() {} },
        window: { addEventListener() {}, removeEventListener() {} },
        setInterval: () => 1,
        clearInterval() {},
        setTimeout,
        clearTimeout,
        require(id) {
            if (id === '../../internal/smcore') return { smcore: {
                tmi: { rds: async () => 'OPEN', join: async () => { throw new Error('join failed'); } },
                lv: { get: () => 0, add() {} },
            } };
            if (id === '../../internal/appcore') return { appcore: {
                tr: { changeside() {} },
                channels: { path: () => 'channels.json', read: () => ['channel'] },
                fs: { exist: () => true, write: (file, contents) => writes.push({ file, contents }) },
                appr: { getPath: () => 'desktop' },
                dg: { showMB: (options) => dialogs.push(options) },
            } };
            if (id === 'electron') return { ipcRenderer: { send: (...args) => sent.push(args) } };
            if (id === 'node:timers/promises') return { setTimeout: async () => {} };
            if (id === './joinEstimate') return require('../src/components/twitch/joinEstimate');
            if (id === './joinFailure') return require('../src/components/twitch/joinFailure');
            if (id === './channelFailureCleanup') return require('../src/components/twitch/channelFailureCleanup');
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    await assert.rejects(context.module.exports.jc(), /Não foi possível entrar em nenhum canal/);
    assert.equal(element('#cntotal').textContent, 'Canais: 0 (1 falharam)');
    assert.equal(element('#cntotal').attributes['data-state'], 'partial');
    assert.deepEqual(sent.filter(([name]) => name === 'sendChannelstoConsole'), [['sendChannelstoConsole', 0]]);
    assert.match(sent[0][1], /Falharam: channel \(erro ao conectar\)/);
    assert.match(sent.at(-1)[1], /0 conectados, 1 falha/);
    assert.equal(writes.length, 2);
    assert.match(writes[0].file, /smlurker_backup-channels_/);
    assert.deepEqual(JSON.parse(writes[0].contents), ['channel']);
    assert.equal(writes[1].file, 'channels.json');
    assert.deepEqual(JSON.parse(writes[1].contents), []);
    assert.match(dialogs[0].detail, /Algumas falhas podem ser temporárias/);
});
