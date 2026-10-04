const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/client.js'), 'utf8');

function createLoginFlow(joinError, hasLegacyCredentials = true, autoConnect = false, savedSession = { type: 'none' }, connectError) {
    const calls = [];
    let onWebLoginResult;
    const elements = new Map();
    const element = (selector) => {
        if (!elements.has(selector)) {
            const classes = new Set();
            elements.set(selector, {
                value: '',
                textContent: '',
                classList: {
                    add: (...names) => names.forEach((name) => classes.add(name)),
                    remove: (...names) => names.forEach((name) => classes.delete(name)),
                    contains: (name) => classes.has(name),
                },
                replaceChildren(...children) { this.children = children; },
                blur() {},
            });
        }
        return elements.get(selector);
    };
    element('#username').value = 'raianwz';
    element('#pass').value = 'oauth:legacy-token';
    element('section#user_box').textContent = 'profile';

    const api = {
        tw: {
            tmi: {
                ini: () => ({}),
                cn: async () => {
                    calls.push('connect');
                    if (connectError) throw connectError;
                },
                dc: async () => { calls.push('disconnect'); },
            },
            data: {
                loadUserData: async () => ({ hasCredentials: hasLegacyCredentials, autoConnect }),
                createProfile: async () => {
                    calls.push('profile');
                    return { displayName: 'RaianWZ', logo: 'https://example.com/avatar.png', userColor: '#9148ff' };
                },
                saveUserData: async () => { calls.push('save'); },
            },
            jcnc: async () => {
                calls.push('join');
                if (joinError) throw joinError;
            },
            jp: () => { calls.push('join-manager'); },
        },
        cr: {
            tr: {
                changeside: (side) => { calls.push(`side:${side}`); },
                blockinput: (blocked) => { calls.push(`block:${blocked}`); },
            },
        },
        console: { manager: () => { calls.push('console'); } },
        auth: {
            onWebLoginResult: (callback) => { onWebLoginResult = callback; },
            restoreWebLogin: async () => savedSession,
            invalidateWebLogin: async () => { calls.push('invalidate-web-login'); },
        },
    };
    const context = vm.createContext({ api, document: {
        getElementById: (id) => element(`#${id}`),
        querySelector: element,
        createElement: (tagName) => ({ tagName, style: {} }),
    } });
    vm.runInContext(source, context);
    return { context, element, calls, webLoginResult: (result) => onWebLoginResult(result) };
}

test('legacy Entrar connects, joins and only then saves credentials', async () => {
    const { context, element, calls } = createLoginFlow();
    await context.entrarTwitch();
    assert.deepEqual(calls.slice(0, 3), ['block:true', 'connect', 'join']);
    assert.ok(calls.indexOf('save') > calls.indexOf('join'));
    assert.equal(element('#btnEntrar').value, 'Desconectar');
    assert.equal(element('#msgStatus').textContent, 'Entrou nos canais!');
});

test('failed channel join does not save credentials or show a connected state', async () => {
    const { context, element, calls } = createLoginFlow(new Error('Nenhum canal adicionado'));
    await context.entrarTwitch();
    assert.equal(calls.includes('save'), false);
    assert.equal(calls.includes('disconnect'), true);
    assert.equal(element('#btnEntrar').value, 'Entrar');
    assert.equal(element('#msgStatus').textContent, 'Nenhum canal adicionado');
});

test('new users see browser login and Web return waits for an explicit channel connection', async () => {
    const { context, element, calls, webLoginResult } = createLoginFlow(undefined, false);
    await new Promise(setImmediate);
    assert.equal(element('#newLoginPanel').classList.contains('none'), false);
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), true);

    await webLoginResult({ type: 'success', username: 'raianwz', accessToken: 'web-token' });
    await new Promise(setImmediate);
    assert.equal(element('#webReadyPanel').classList.contains('none'), false);
    assert.equal(calls.includes('profile'), true);
    assert.equal(element('#login_box').children[0].src, 'https://example.com/avatar.png');
    assert.equal(element('#pass').value, '');
    assert.equal(calls.includes('connect'), false);

    await context.conectarCanaisWeb();
    assert.equal(calls.includes('connect'), true);
    assert.equal(calls.includes('join'), true);
    assert.equal(calls.includes('save'), false);
    assert.equal(element('#pass').value, '');
});

test('legacy users retain the manual login panel', async () => {
    const { element } = createLoginFlow();
    await new Promise(setImmediate);
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), false);
    assert.equal(element('#newLoginPanel').classList.contains('none'), true);
});

test('saved legacy credentials still connect automatically when configured', async () => {
    const { calls } = createLoginFlow(undefined, true, true);
    await new Promise(setImmediate);
    assert.equal(calls.includes('connect'), true);
});

test('restored Web login connects automatically when configured, without using legacy credentials', async () => {
    const saved = { type: 'success', username: 'raianwz', accessToken: 'saved-web-token' };
    const { context, element, calls } = createLoginFlow(undefined, true, true, saved);
    await new Promise(setImmediate);
    assert.equal(element('#webReadyPanel').classList.contains('none'), false);
    assert.equal(calls.includes('connect'), true);
    assert.equal(element('#pass').value, '');
    assert.equal(calls.filter((call) => call === 'connect').length, 1);
    assert.equal(calls.includes('save'), false);
});

test('fresh Web login connects automatically when the existing setting is enabled', async () => {
    const { calls, webLoginResult } = createLoginFlow(undefined, false, true);
    await new Promise(setImmediate);
    assert.equal(calls.includes('connect'), false);
    await webLoginResult({ type: 'success', username: 'raianwz', accessToken: 'web-token' });
    await new Promise(setImmediate);
    assert.equal(calls.includes('connect'), true);
    assert.equal(calls.includes('save'), false);
});

test('invalid restored Web session does not auto-connect the legacy account', async () => {
    const invalid = { type: 'error', requiresLogin: true, message: 'Entre novamente.' };
    const { element, calls } = createLoginFlow(undefined, true, true, invalid);
    await new Promise(setImmediate);
    assert.equal(calls.includes('connect'), false);
    assert.equal(element('#msgStatus').textContent, 'Entre novamente.');
});

test('IRC authentication failure clears the Web session and returns to login', async () => {
    const { element, calls, webLoginResult } = createLoginFlow(
        undefined, false, true, { type: 'none' }, new Error('Login authentication failed')
    );
    await new Promise(setImmediate);
    await webLoginResult({ type: 'success', username: 'raianwz', accessToken: 'bad-token' });
    await new Promise(setImmediate);
    assert.equal(calls.includes('invalidate-web-login'), true);
    assert.equal(element('#newLoginPanel').classList.contains('none'), false);
    assert.match(element('#msgStatus').textContent, /Entre com a Twitch novamente/);
});
