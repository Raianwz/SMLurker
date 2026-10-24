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
    assert.equal(webOrigin(true, ''), 'https://web.smlurker.rwz.app');
    assert.equal(webOrigin(true, 'https://web.example.com'), 'https://web.example.com');
    assert.throws(() => webOrigin(true, 'http://web.example.com'), /HTTPS/);
    assert.throws(() => webOrigin(false, 'https://web.example.com/path'), /origem/);
});

test('development login uses localhost when available and falls back to the hosted Web when unavailable', async () => {
    const opened = [];
    const probes = [];
    const createLogin = (probeImpl) => createWebLogin({
        isPackaged: false,
        configuredUrl: '',
        openExternal: async (url) => opened.push(new URL(url)),
        onResult: () => {},
        probeImpl: async (url, options) => {
            probes.push({ url, options });
            return probeImpl();
        },
    });

    await createLogin(() => ({ status: 200 })).start();
    await createLogin(() => { throw new Error('Local Web offline'); }).start();

    assert.equal(probes.length, 2);
    assert.equal(probes[0].url, 'http://localhost:3000');
    assert.equal(probes[0].options.method, 'HEAD');
    assert.equal(opened[0].origin, 'http://localhost:3000');
    assert.equal(opened[1].origin, 'https://smlurker.vercel.app');
    assert.equal(opened[1].pathname, '/connect/apps/com.smlurker');
});

test('explicit Web origin is used without a localhost probe', async () => {
    let openedUrl;
    const login = createWebLogin({
        isPackaged: false,
        configuredUrl: 'https://example.com',
        openExternal: async (url) => { openedUrl = new URL(url); },
        onResult: () => {},
        probeImpl: () => { throw new Error('Unexpected probe'); },
    });

    await login.start();
    assert.equal(openedUrl.origin, 'https://example.com');
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
    assert.match(results.at(-1).message, /link de login já foi usado|tentativa anterior/);
});

test('confirms a Web login only after the application accepts it', async () => {
    const receipt = 'R'.repeat(43);
    const requests = [];
    let openedUrl;
    let acceptLogin = true;
    const login = createWebLogin({
        isPackaged: true,
        configuredUrl: 'https://web.example.com',
        openExternal: async (url) => { openedUrl = new URL(url); },
        onResult: () => acceptLogin,
        fetchImpl: async (url, options) => {
            requests.push({ url, options });
            if (url.endsWith('/exchange')) {
                return { ok: true, json: async () => ({
                    user: { login: 'raianwz' }, accessToken: 'valid_access_token', completionToken: receipt,
                }) };
            }
            return { ok: true, status: 204 };
        },
    });
    const callback = async () => {
        await login.start();
        await login.handleCallback(`smlurker://auth/callback?code=${'A'.repeat(32)}&state=${openedUrl.searchParams.get('state')}`);
    };

    await callback();
    assert.equal(requests[1].url, 'https://web.example.com/api/apps/com.smlurker/complete');
    assert.equal(requests[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(requests[1].options.body), { completionToken: receipt });
    assert.equal(requests[1].options.body.includes('valid_access_token'), false);

    acceptLogin = false;
    await callback();
    assert.equal(requests.length, 3);
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
