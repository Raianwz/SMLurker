const test = require('node:test');
const assert = require('node:assert/strict');
const { createWebSession } = require('../src/components/twitch/webSession');

function fixture(fetchImpl) {
    let stored;
    const fileSystem = {
        existsSync: () => stored !== undefined,
        mkdirSync: () => {},
        writeFileSync: (_path, data) => { stored = data; },
        readFileSync: () => stored,
        unlinkSync: () => { stored = undefined; },
    };
    const safeStorage = {
        isEncryptionAvailable: () => true,
        getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    return {
        session: createWebSession({ directory: 'test-config', safeStorage, fileSystem, fetchImpl }),
        getStored: () => stored,
    };
}

test('stores Web credentials separately and restores only a Twitch-validated token', async () => {
    const { session, getStored } = fixture(async (url, options) => {
        assert.equal(url, 'https://id.twitch.tv/oauth2/validate');
        assert.equal(options.headers.Authorization, 'OAuth valid-web-token');
        return { ok: true, json: async () => ({ login: 'raianwz', expires_in: 3600 }) };
    });
    assert.equal(session.save({ username: 'RaianWZ', accessToken: 'valid-web-token' }), true);
    assert.equal(getStored().toString().includes('valid-web-token'), false);
    assert.deepEqual(await session.restore(), { type: 'success', username: 'raianwz', accessToken: 'valid-web-token' });
});

test('revoked saved token is removed, while temporary validation errors keep it for retry', async () => {
    const revoked = fixture(async () => ({ status: 401, ok: false }));
    revoked.session.save({ username: 'raianwz', accessToken: 'valid-web-token' });
    assert.equal((await revoked.session.restore()).requiresLogin, true);
    assert.equal(revoked.getStored(), undefined);

    const offline = fixture(async () => { throw new Error('offline'); });
    offline.session.save({ username: 'raianwz', accessToken: 'valid-web-token' });
    assert.equal((await offline.session.restore()).requiresLogin, undefined);
    assert.ok(offline.getStored());
});
