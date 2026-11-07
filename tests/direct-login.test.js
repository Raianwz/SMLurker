const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDirectLogin } = require('../src/components/twitch/directLogin');
const { createDirectSession } = require('../src/components/twitch/directSession');

const clientId = 'testclientid123456';
const answer = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

test('device login waits for Twitch authorization and uses only the public client ID', async () => {
    let tokenRequests = 0;
    const login = createDirectLogin({ clientId, wait: async () => {}, fetchImpl: async (url, options) => {
        if (url.endsWith('/device')) {
            const form = new URLSearchParams(options.body);
            assert.equal(form.get('scopes'), 'chat:read');
            assert.equal(form.has('client_secret'), false);
            return answer(200, { device_code: 'device123', user_code: 'ABCDEFGH', verification_uri: 'https://www.twitch.tv/activate?public=true', expires_in: 1800, interval: 5 });
        }
        const form = new URLSearchParams(options.body);
        assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:device_code');
        assert.equal(form.get('scopes'), 'chat:read');
        assert.equal(form.has('client_secret'), false);
        tokenRequests++;
        return tokenRequests === 1 ? answer(400, { message: 'authorization_pending' })
            : answer(200, { access_token: 'access-token-123', refresh_token: 'refresh-token-123' });
    } });
    const device = await login.begin();
    const tokens = await login.poll(device);
    assert.equal(tokenRequests, 2);
    assert.equal(tokens.refresh_token, 'refresh-token-123');
});

test('saved direct session refreshes an invalid access token and persists the rotated refresh token', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smlurker-device-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const safeStorage = {
        isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    const session = createDirectSession({ directory, safeStorage,
        directLogin: {
            validate: async (token) => token === 'new-access-token' ? 'raianwz' : null,
            refresh: async (token) => {
                assert.equal(token, 'old-refresh-token');
                return { access_token: 'new-access-token', refresh_token: 'new-refresh-token' };
            },
        },
    });
    assert.equal(session.save({ username: 'raianwz', accessToken: 'old-access-token', refreshToken: 'old-refresh-token' }), true);
    const stored = () => fs.readFileSync(path.join(directory, 'UserOAuth.bin'));
    assert.equal(stored().includes('old-refresh-token'), false);
    assert.deepEqual(await session.restore(), { type: 'success', source: 'direct', username: 'raianwz', accessToken: 'new-access-token' });
    assert.equal(safeStorage.decryptString(stored()).includes('new-refresh-token'), true);
});

test('direct session can renew a still valid access token after IRC rejects it', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smlurker-device-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const safeStorage = {
        isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    let refreshed = false;
    const session = createDirectSession({ directory, safeStorage,
        directLogin: {
            validate: async () => 'raianwz',
            refresh: async (token) => {
                assert.equal(token, 'old-refresh-token');
                refreshed = true;
                return { access_token: 'new-access-token', refresh_token: 'new-refresh-token' };
            },
        },
    });
    session.save({ username: 'raianwz', accessToken: 'old-access-token', refreshToken: 'old-refresh-token' });
    const result = await session.renew();
    assert.equal(refreshed, true);
    assert.equal(result.accessToken, 'new-access-token');
    assert.match(safeStorage.decryptString(fs.readFileSync(path.join(directory, 'UserOAuth.bin'))), /new-refresh-token/);
});
