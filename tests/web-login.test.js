const test = require('node:test');
const assert = require('node:assert/strict');
const { callbackFromArgs, callbackFromUrl, createWebLogin, webOrigin } = require('../src/components/twitch/webLogin');

test('accepts only the SMLurker callback and never credentials in a link', () => {
    assert.equal(callbackFromUrl('https://example.com/auth/callback?code=abc'), null);
    assert.equal(callbackFromUrl('smlurker://other/callback?code=abc'), null);
    assert.equal(callbackFromUrl('smlurker://auth/callback?access_token=secret'), null);
    assert.equal(callbackFromArgs(['electron.exe', 'smlurker://auth/callback?code=abc&state=xyz']),
        'smlurker://auth/callback?code=abc&state=xyz');
});

test('requires HTTPS outside local development', () => {
    assert.equal(webOrigin(false, 'http://localhost:3000'), 'http://localhost:3000');
    assert.equal(webOrigin(true, 'https://web.example.com'), 'https://web.example.com');
    assert.throws(() => webOrigin(true, 'http://web.example.com'), /HTTPS/);
    assert.throws(() => webOrigin(false, 'https://web.example.com/path'), /origem/);
});

test('exchanges a one-time code only after matching the pending state', async () => {
    let openedUrl;
    let exchanges = 0;
    const results = [];
    const login = createWebLogin({
        isPackaged: false,
        configuredUrl: 'http://localhost:3000',
        openExternal: async (url) => { openedUrl = new URL(url); },
        onResult: (result) => results.push(result),
        fetchImpl: async (url, options) => {
            exchanges += 1;
            assert.equal(url, 'http://localhost:3000/api/apps/com.smlurker/exchange');
            const body = JSON.parse(options.body);
            assert.equal(body.code, 'A'.repeat(32));
            assert.ok(body.codeVerifier);
            assert.equal(body.redirectUri, 'smlurker://auth/callback');
            return { ok: true, json: async () => ({ user: { login: 'RaianWZ' }, accessToken: 'valid_access_token' }) };
        },
    });

    await login.start();
    assert.equal(openedUrl.pathname, '/connect/apps/com.smlurker');
    assert.equal(openedUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(openedUrl.searchParams.has('access_token'), false);
    const state = openedUrl.searchParams.get('state');
    assert.ok(state);

    await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=wrong`);
    assert.equal(exchanges, 0);
    await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=${state}`);
    assert.equal(exchanges, 1);
    assert.deepEqual(results.at(-1), { type: 'success', username: 'raianwz', accessToken: 'valid_access_token' });

    await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=${state}`);
    assert.equal(exchanges, 1);
    assert.equal(results.at(-1).type, 'error');
});

test('rejects expired handoffs and reports the Web standby response', async () => {
    let time = 0;
    let openedUrl;
    const results = [];
    const login = createWebLogin({
        isPackaged: false,
        configuredUrl: 'http://localhost:3000',
        openExternal: async (url) => { openedUrl = new URL(url); },
        onResult: (result) => results.push(result),
        now: () => time,
        fetchImpl: async () => ({ status: 501, ok: false }),
    });

    await login.start();
    time = 5 * 60 * 1000 + 1;
    await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=${openedUrl.searchParams.get('state')}`);
    assert.match(results.at(-1).message, /expirou/);

    await login.start();
    await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=${openedUrl.searchParams.get('state')}`);
    assert.match(results.at(-1).message, /ainda não está disponível/);
});
