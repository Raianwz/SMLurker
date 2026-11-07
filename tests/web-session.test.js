const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWebSession } = require('../src/components/twitch/webSession');

function fixture(t, fetchImpl) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smlurker-web-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const sessionPath = path.join(directory, 'UserOAuth.bin');
    const safeStorage = {
        isEncryptionAvailable: () => true,
        getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    return {
        session: createWebSession({ directory, safeStorage, fetchImpl }),
        safeStorage,
        getStored: () => fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath) : undefined,
    };
}

test('stores Web credentials in the shared encrypted file and restores only a Twitch-validated token', async (t) => {
    const { session, getStored } = fixture(t, async (url, options) => {
        assert.equal(url, 'https://id.twitch.tv/oauth2/validate');
        assert.equal(options.headers.Authorization, 'OAuth valid-web-token');
        return { ok: true, json: async () => ({ login: 'raianwz', expires_in: 3600 }) };
    });
    assert.equal(session.save({ username: 'RaianWZ', accessToken: 'valid-web-token' }), true);
    assert.equal(getStored().toString().includes('valid-web-token'), false);
    assert.deepEqual(await session.restore(), { type: 'success', username: 'raianwz', accessToken: 'valid-web-token' });
});

test('revoked saved token is removed, while temporary validation errors keep it for retry', async (t) => {
    const revoked = fixture(t, async () => ({ status: 401, ok: false }));
    revoked.session.save({ username: 'raianwz', accessToken: 'valid-web-token' });
    assert.equal((await revoked.session.restore()).requiresLogin, true);
    assert.equal(JSON.parse(revoked.safeStorage.decryptString(revoked.getStored())).web, null);

    const offline = fixture(t, async () => { throw new Error('offline'); });
    offline.session.save({ username: 'raianwz', accessToken: 'valid-web-token' });
    assert.equal((await offline.session.restore()).requiresLogin, undefined);
    assert.ok(offline.getStored());
});
