const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/client.js'), 'utf8');

function createLoginFlow(joinError, hasLegacyCredentials = true, autoConnect = false, savedSession = { type: 'none' }, connectError, dialogAnswer = 1, savedChannels = ['#raianwz', '#outro'], joinResult, storedValues = new Map()) {
    const calls = [];
    const profileTokens = [];
    const trayStatuses = [];
    const joinedSelections = [];
    const clientHandlers = new Map();
    let onWebLoginResult;
    let onAppActionRequested;
    const elements = new Map();
    const createNode = () => {
            const classes = new Set();
            const handlers = {};
            return {
                value: '',
                textContent: '',
                hidden: false,
                open: false,
                dataset: {},
                handlers,
                attributes: {},
                children: [],
                classList: {
                    add: (...names) => names.forEach((name) => classes.add(name)),
                    remove: (...names) => names.forEach((name) => classes.delete(name)),
                    contains: (name) => classes.has(name),
                },
                addEventListener(name, listener) { handlers[name] = listener; },
                removeEventListener(name) { delete handlers[name]; },
                setAttribute(name, value) { this.attributes[name] = value; },
                replaceChildren(...children) { this.children = children; },
                append(...children) { this.children.push(...children); },
                showModal() { this.open = true; },
                close() { this.open = false; this.handlers.close?.(); },
                focus() {},
                blur() {},
            };
    };
    const element = (selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, createNode());
        }
        return elements.get(selector);
    };
    element('#username').value = 'raianwz';
    element('#pass').value = 'oauth:legacy-token';
    element('section#user_box').textContent = 'profile';

    const api = {
        channels: { list: async () => savedChannels },
        tw: {
            tmi: {
                ini: () => ({
                    on: (name, listener) => clientHandlers.set(name, listener),
                }),
                channels: () => ['#raianwz', '#outro'],
                cn: async () => {
                    calls.push('connect');
                    const failure = typeof connectError === 'function' ? connectError() : connectError;
                    if (failure) throw failure;
                },
                dc: async () => { calls.push('disconnect'); },
            },
            data: {
                loadUserData: async () => {
                    if (hasLegacyCredentials) {
                        element('#username').value = 'raianwz';
                        element('#pass').value = 'oauth:legacy-token';
                    }
                    return { hasCredentials: hasLegacyCredentials, autoConnect };
                },
                createProfile: async (token) => {
                    calls.push('profile');
                    profileTokens.push(token);
                    return { displayName: 'RaianWZ', logo: 'https://example.com/avatar.png', userColor: '#9148ff' };
                },
                saveUserData: async () => { calls.push('save'); },
            },
            jcnc: async (channels) => {
                calls.push('join');
                joinedSelections.push(channels);
                if (joinError) throw typeof joinError === 'function' ? joinError(savedChannels) : joinError;
                return typeof joinResult === 'function' ? joinResult(channels) : joinResult;
            },
            jp: () => { calls.push('join-manager'); },
        },
        cr: {
            dg: { showMB: (options) => { calls.push(options); return dialogAnswer; } },
            ipc: { send: (name, status) => {
                if (name === 'tray:connection-status') trayStatuses.push(status);
                if (name === 'sendtoCleanConsole') calls.push('clean-console');
            } },
            tr: {
                changeside: (side) => { calls.push(`side:${side}`); },
                blockinput: (blocked) => { calls.push(`block:${blocked}`); },
            },
        },
        console: { manager: () => { calls.push('console'); } },
        auth: {
            onWebLoginResult: (callback) => { onWebLoginResult = callback; },
            startWebLogin: async () => { calls.push('start-web-login'); return { ok: true }; },
            restoreWebLogin: async () => typeof savedSession === 'function' ? savedSession() : savedSession,
            invalidateWebLogin: async () => { calls.push('invalidate-web-login'); },
            logoutWebLogin: async () => { calls.push('logout-web-login'); return { ok: true }; },
        },
        reload: {
            onRequested: (callback) => { onAppActionRequested = callback; },
            perform: (action) => { calls.push(`perform:${action}`); },
        },
    };
    const context = vm.createContext({ api, setTimeout, clearTimeout,
        localStorage: { getItem: (key) => storedValues.get(key) ?? null, setItem: (key, value) => storedValues.set(key, value) },
        document: {
        getElementById: (id) => element(`#${id}`),
        querySelector: element,
        createElement: (tagName) => Object.assign(createNode(), { tagName, style: {} }),
    } });
    vm.runInContext(source, context);
    return {
        context, element, calls, trayStatuses, profileTokens, joinedSelections, storedValues,
        emitClient: (name) => clientHandlers.get(name)?.(),
        webLoginResult: (result) => onWebLoginResult(result),
        requestAppAction: (action) => onAppActionRequested(action),
    };
}

test('reload asks before leaving connected channels and disconnects before reloading', async () => {
    const flow = createLoginFlow();
    await flow.context.entrarTwitch();
    await flow.requestAppAction('reload');
    const dialog = flow.calls.find((call) => typeof call === 'object');
    assert.equal(dialog.message, 'Deseja recarregar o SMLurker?');
    assert.match(dialog.detail, /conectado à Twitch/);
    assert.deepEqual(Array.from(dialog.buttons), ['Não', 'Sim']);
    assert.equal(dialog.cancelId, 0);
    assert.ok(flow.calls.indexOf('disconnect') < flow.calls.indexOf('perform:reload'));
    assert.ok(flow.calls.indexOf('clean-console') < flow.calls.indexOf('perform:reload'));
});

test('declining reload keeps the Twitch connection and page active', async () => {
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 0);
    await flow.context.entrarTwitch();
    await flow.requestAppAction('reload');
    assert.equal(flow.calls.includes('disconnect'), false);
    assert.equal(flow.calls.includes('perform:reload'), false);
});

test('reload without a channel connection needs no confirmation', async () => {
    const flow = createLoginFlow();
    await flow.requestAppAction('reload');
    assert.equal(flow.calls.some((call) => typeof call === 'object'), false);
    assert.equal(flow.calls.includes('perform:reload'), true);
});

test('restart confirms and disconnects before relaunching', async () => {
    const flow = createLoginFlow();
    await flow.context.entrarTwitch();
    await flow.requestAppAction('restart');
    assert.ok(flow.calls.indexOf('disconnect') < flow.calls.indexOf('perform:restart'));
    assert.equal(flow.calls.find((call) => typeof call === 'object').message, 'Deseja reiniciar agora?');
});

test('legacy Entrar connects, joins and only then saves credentials', async () => {
    const { context, element, calls, trayStatuses, profileTokens } = createLoginFlow();
    await context.entrarTwitch();
    assert.deepEqual(calls.slice(0, 2), ['block:true', 'connect']);
    assert.ok(calls.indexOf('profile') < calls.indexOf('join'));
    assert.ok(calls.indexOf('save') > calls.indexOf('join'));
    assert.equal(element('#btnEntrar').value, 'Desconectar');
    assert.equal(element('#msgStatus').textContent, 'Canais conectados.');
    assert.equal(element('#connectedStatus').textContent, 'Canais conectados.');
    assert.equal(element('#msgStatus').attributes['data-state'], 'connected');
    assert.deepEqual(trayStatuses, ['connecting', 'connected']);
    assert.deepEqual(profileTokens, ['oauth:legacy-token']);
});

test('disconnect stays unavailable until the initial channel entry finishes', async () => {
    let finishJoining;
    const joining = new Promise(resolve => { finishJoining = resolve; });
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 1,
        ['#raianwz', '#outro'], () => joining);
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);

    assert.equal(flow.calls.includes('join'), true);
    assert.equal(flow.element('#app_exit').classList.contains('none'), true);
    await flow.context.sairTwitch();
    assert.equal(flow.calls.includes('disconnect'), false);

    finishJoining({ removed: [] });
    await connecting;
    assert.equal(flow.element('#app_exit').classList.contains('none'), false);
    await flow.context.sairTwitch();
    assert.equal(flow.calls.includes('disconnect'), true);
    assert.equal(flow.element('#app_exit').classList.contains('none'), true);
});

test('repeated disconnect clicks close IRC once and do not show reconnection', async () => {
    const flow = createLoginFlow();
    await flow.context.entrarTwitch();
    let finishDisconnect;
    let disconnectCalls = 0;
    flow.context.api.tw.tmi.dc = () => {
        disconnectCalls++;
        return new Promise(resolve => { finishDisconnect = resolve; });
    };

    const first = flow.context.sairTwitch();
    const second = flow.context.sairTwitch();
    flow.emitClient('disconnected');
    assert.equal(disconnectCalls, 1);
    assert.equal(flow.element('#connectedStatus').textContent, 'Saindo dos canais...');
    assert.equal(flow.element('#app_exit').classList.contains('none'), true);
    assert.equal(flow.trayStatuses.includes('reconnecting'), false);

    finishDisconnect();
    await Promise.all([first, second]);
    assert.equal(flow.element('#msgStatus').textContent, 'Desconectado dos canais. Você pode entrar novamente quando quiser.');
});

test('more than 100 saved channels require a selection before connecting', async () => {
    const savedChannels = Array.from({ length: 102 }, (_, index) => `#canal${index}`);
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 1, savedChannels);
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);

    assert.equal(flow.element('#channelSelectionDialog').open, true);
    assert.equal(flow.calls.includes('connect'), false);
    assert.match(flow.element('#channelSelectionCount').textContent, /100 de 100/);
    const items = flow.element('#channelSelectionItems').children;
    assert.equal(items.length, 102);
    assert.equal(items.filter(item => item.children[0].checked).length, 100);
    items[0].children[0].checked = false;
    items[0].children[0].handlers.change();
    items[100].children[0].checked = true;
    items[100].children[0].handlers.change();
    flow.element('#channelSelectionConfirm').onclick();
    await connecting;

    assert.equal(flow.joinedSelections[0].length, 100);
    assert.equal(flow.joinedSelections[0].includes('#canal0'), false);
    assert.equal(flow.joinedSelections[0].includes('#canal100'), true);
    assert.equal(JSON.parse(flow.storedValues.get('smlurker:selected-channels')).length, 100);
});

test('removed channels leave the saved connection selection after joining', async () => {
    const savedChannels = Array.from({ length: 101 }, (_, index) => `#canal${index}`);
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 1,
        savedChannels, { removed: ['#canal0'] });
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);
    flow.element('#channelSelectionConfirm').onclick();
    await connecting;
    const selected = JSON.parse(flow.storedValues.get('smlurker:selected-channels'));
    assert.equal(selected.length, 99);
    assert.equal(selected.includes('#canal0'), false);
    assert.equal(selected.includes('#canal1'), true);
});

test('selection is pruned when all joins fail after a channel was removed', async () => {
    const savedChannels = Array.from({ length: 101 }, (_, index) => `#canal${index}`);
    const flow = createLoginFlow((channels) => {
        channels.shift();
        return new Error('Nenhum canal pôde ser conectado.');
    }, true, false, { type: 'none' }, undefined, 1, savedChannels);
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);
    flow.element('#channelSelectionConfirm').onclick();
    await connecting;
    const selected = JSON.parse(flow.storedValues.get('smlurker:selected-channels'));
    assert.equal(selected.length, 99);
    assert.equal(selected.includes('#canal0'), false);
});

test('cancelling channel selection does not connect to Twitch', async () => {
    const savedChannels = Array.from({ length: 101 }, (_, index) => `#canal${index}`);
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 1, savedChannels);
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);
    flow.element('#channelSelectionCancel').onclick();
    await connecting;
    assert.equal(flow.calls.includes('connect'), false);
    assert.equal(flow.element('#channelSelectionDialog').open, false);
});

test('a 134-entry list can search and swap a channel near the end before joining', async () => {
    const savedChannels = [
        ...Array.from({ length: 132 }, (_, index) => `#canal${index}`),
        '#zealryth', '#canal42',
    ];
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, undefined, 1, savedChannels);
    const connecting = flow.context.entrarTwitch();
    await new Promise(setImmediate);

    const rows = flow.element('#channelSelectionItems').children;
    assert.equal(rows.length, 133);
    assert.equal(rows.filter(row => row.children[0].checked).length, 100);
    const search = flow.element('#channelSelectionSearch');
    search.value = 'zeal';
    search.oninput();
    assert.equal(rows.filter(row => !row.hidden).length, 1);
    assert.equal(rows.at(-1).children[1].textContent, '#zealryth');
    assert.match(flow.element('#channelSelectionMatches').textContent, /1 de 133/);

    flow.element('#channelSelectionClear').onclick();
    assert.equal(rows.some(row => row.children[0].checked), false);
    assert.match(flow.element('#channelSelectionCount').textContent, /0 de 100/);
    assert.equal(flow.element('#channelSelectionConfirm').disabled, true);
    flow.element('#channelSelectionFirst').onclick();
    assert.equal(rows.filter(row => row.children[0].checked).length, 100);
    assert.equal(flow.element('#channelSelectionConfirm').disabled, false);

    rows.at(-1).children[0].checked = true;
    rows.at(-1).children[0].handlers.change();
    assert.equal(rows.at(-1).children[0].checked, false);
    assert.match(flow.element('#channelSelectionCount').textContent, /Desmarque um/);
    rows[0].children[0].checked = false;
    rows[0].children[0].handlers.change();
    rows.at(-1).children[0].checked = true;
    rows.at(-1).children[0].handlers.change();
    flow.element('#channelSelectionConfirm').onclick();
    await connecting;

    assert.equal(flow.joinedSelections[0].length, 100);
    assert.equal(flow.joinedSelections[0].includes('#canal0'), false);
    assert.equal(flow.joinedSelections[0].includes('#zealryth'), true);
});

test('shows live channels beside connection status and clears them on disconnect', async () => {
    const flow = createLoginFlow();
    const queried = [];
    flow.context.api.streams = {
        status: async (logins) => {
            queried.push(...logins);
            return [
                { login: 'raianwz', is_live: true, stale: false },
                { login: 'outro', is_live: false, stale: false },
            ];
        },
    };
    await flow.context.entrarTwitch();
    await new Promise(setImmediate);
    assert.deepEqual(queried, ['raianwz', 'outro']);
    assert.equal(flow.element('#liveStatus').textContent, 'Ao vivo: 1');
    assert.equal(flow.element('#liveStatus').hidden, false);
    assert.equal(flow.element('#liveStatus').disabled, false);
    flow.element('#liveStatus').handlers.click();
    assert.equal(flow.element('#liveChannelList').hidden, false);
    assert.equal(flow.element('#liveChannelList').children[0].textContent, '#raianwz');
    assert.equal(flow.element('#liveStatus').attributes['aria-expanded'], 'true');
    assert.match(flow.element('#sessionUptime').textContent, /^Tempo conectado: \d{2}:\d{2}:\d{2}$/);
    await flow.context.sairTwitch();
    assert.equal(flow.element('#liveStatus').hidden, true);
    assert.equal(flow.element('#liveChannelList').hidden, true);
    assert.equal(flow.element('#sessionUptime').hidden, true);
});

test('does not show zero live channels when the joined-channel list is unavailable', async () => {
    const flow = createLoginFlow();
    let queried = false;
    flow.context.api.tw.tmi.channels = () => [];
    flow.context.api.streams = { status: async () => { queried = true; return []; } };
    await flow.context.entrarTwitch();
    await new Promise(setImmediate);
    assert.equal(queried, false);
    assert.equal(flow.element('#liveStatus').textContent, 'Ao vivo: indisponível');
    await flow.context.sairTwitch();
});

test('tray shows reconnection and recovery after an IRC interruption', async () => {
    const { context, element, trayStatuses, emitClient } = createLoginFlow();
    await context.entrarTwitch();
    emitClient('disconnected');
    assert.equal(element('#connectedStatus').textContent, 'Reconectando ao chat da Twitch...');
    assert.equal(element('#sessionUptime').hidden, false);
    emitClient('connected');
    assert.equal(element('#connectedStatus').textContent, 'Canais conectados.');
    assert.equal(element('#sessionUptime').hidden, false);
    assert.deepEqual(trayStatuses, ['connecting', 'connected', 'reconnecting', 'connected']);
});

test('session verification has a visible state and a temporary failure can be retried', async () => {
    let restoreAttempts = 0;
    const flow = createLoginFlow(undefined, false, false, () => {
        restoreAttempts++;
        return restoreAttempts === 1
            ? { type: 'error', message: 'Não foi possível verificar a sessão.' }
            : { type: 'success', username: 'raianwz', accessToken: 'restored-token' };
    });
    assert.equal(flow.element('#msgStatus').textContent, 'Verificando sessão salva...');
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'checking');
    await new Promise(setImmediate);
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'error');
    assert.equal(flow.element('#retryConnection').hidden, false);
    flow.element('#retryConnection').handlers.click();
    await new Promise(setImmediate);
    assert.equal(restoreAttempts, 2);
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'ready');
    assert.equal(flow.element('#retryConnection').hidden, true);
});

test('restored session notice appears only once for each Web account', async () => {
    const storedValues = new Map();
    const restore = (username) => createLoginFlow(undefined, false, false,
        { type: 'success', username, accessToken: 'restored-token' },
        undefined, 1, ['#raianwz'], undefined, storedValues);

    const first = restore('raianwz');
    await new Promise(setImmediate);
    assert.match(first.element('#msgStatus').textContent, /Sessão restaurada/);

    const reopened = restore('raianwz');
    await new Promise(setImmediate);
    assert.equal(reopened.element('#msgStatus').textContent, '');
    assert.equal(reopened.element('#webReadyPanel').classList.contains('none'), false);

    const otherAccount = restore('outraconta');
    await new Promise(setImmediate);
    assert.match(otherAccount.element('#msgStatus').textContent, /Sessão restaurada/);
});

test('a failed IRC connection shows an error and retry connects with the same credentials', async () => {
    let attempts = 0;
    const flow = createLoginFlow(undefined, true, false, { type: 'none' }, () =>
        ++attempts === 1 ? new Error('Falha de rede') : null);
    const connecting = flow.context.entrarTwitch();
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'info');
    await connecting;
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'error');
    assert.equal(flow.element('#msgStatus').textContent, 'Falha de rede');
    assert.equal(flow.element('#retryConnection').hidden, false);
    flow.element('#retryConnection').handlers.click();
    await new Promise(setImmediate);
    assert.equal(attempts, 2);
    assert.equal(flow.element('#msgStatus').attributes['data-state'], 'connected');
    assert.equal(flow.element('#retryConnection').hidden, true);
});

test('failed channel join does not save credentials or show a connected state', async () => {
    const { context, element, calls, trayStatuses } = createLoginFlow(new Error('Nenhum canal adicionado'));
    await context.entrarTwitch();
    assert.equal(calls.includes('save'), false);
    assert.equal(calls.includes('disconnect'), true);
    assert.equal(element('#btnEntrar').value, 'Entrar nos canais');
    assert.equal(element('#classicLoginError').textContent, 'Nenhum canal adicionado');
    assert.deepEqual(trayStatuses, ['connecting', 'disconnected']);
    assert.equal(element('#classicLoginError').hidden, false);
    assert.equal(element('#msgStatus').textContent, '');
    assert.equal(element('#retryConnection').hidden, false);
    assert.equal(calls.includes('side:0'), true);
});

test('new users see browser login and Web return waits for an explicit channel connection', async () => {
    const { context, element, calls, webLoginResult, profileTokens } = createLoginFlow(undefined, false);
    await new Promise(setImmediate);
    assert.equal(element('#newLoginPanel').classList.contains('none'), false);
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), true);

    await webLoginResult({ type: 'success', username: 'raianwz', accessToken: 'web-token' });
    await new Promise(setImmediate);
    assert.equal(element('#webReadyPanel').classList.contains('none'), false);
    assert.equal(element('#btnUseLegacyLogin').classList.contains('none'), true);
    assert.equal(calls.includes('profile'), true);
    assert.deepEqual(profileTokens, ['oauth:web-token']);
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

test('saved legacy users can switch from Web login back to OAuth without changing either session', async () => {
    const saved = { type: 'success', username: 'webuser', accessToken: 'saved-web-token' };
    const { context, element, calls } = createLoginFlow(undefined, true, false, saved);
    await new Promise(setImmediate);
    assert.equal(element('#btnUseLegacyLogin').classList.contains('none'), false);
    assert.equal(element('#pass').value, '');

    await context.voltarLoginLegado();
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), false);
    assert.equal(element('#username').value, 'raianwz');
    assert.equal(element('#pass').value, 'oauth:legacy-token');
    assert.equal(calls.includes('save'), false);

    await context.iniciarLoginWeb();
    assert.equal(element('#webReadyPanel').classList.contains('none'), false);
    assert.equal(element('#pass').value, '');
    assert.equal(calls.includes('connect'), false);
});

test('signing out clears the Web session and returns to login without removing legacy credentials', async () => {
    const saved = { type: 'success', username: 'webuser', accessToken: 'saved-web-token' };
    const { context, element, calls } = createLoginFlow(undefined, true, false, saved);
    await new Promise(setImmediate);

    await context.sairDaContaWeb();

    assert.equal(calls.includes('logout-web-login'), true);
    assert.equal(calls.includes('invalidate-web-login'), false);
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), false);
    assert.equal(element('#webReadyPanel').classList.contains('none'), true);
    assert.equal(element('#pass').value, 'oauth:legacy-token');
    assert.equal(element('#username').value, 'raianwz');
    assert.match(element('#msgStatus').textContent, /saiu da conta Twitch/);

    await context.voltarLoginLegado();
    assert.equal(element('#pass').value, 'oauth:legacy-token');
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
    assert.equal(element('#legacyLoginPanel').classList.contains('none'), false);
    assert.equal(element('#msgStatus').textContent,
        'A sessão do login Web não está mais válida. Para usar o OAuth salvo, clique em Entrar.');
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
    assert.equal(element('#retryConnection').textContent, 'Entrar novamente');
    element('#retryConnection').handlers.click();
    await new Promise(setImmediate);
    assert.equal(calls.includes('start-web-login'), true);
});
