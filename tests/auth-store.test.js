const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createAuthStore } = require('../src/components/twitch/authStore');

function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smlurker-auth-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const safeStorage = {
        isEncryptionAvailable: () => true,
        getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    const store = createAuthStore({ directory, safeStorage });
    const writeOld = (filename, value) => fs.writeFileSync(path.join(directory, filename), safeStorage.encryptString(JSON.stringify(value)));
    const saved = () => JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(directory, 'UserOAuth.bin'))));
    return { directory, safeStorage, store, writeOld, saved };
}

test('migrates classic, Web and device credentials into one protected file', (t) => {
    const { directory, store, writeOld, saved } = fixture(t);
    writeOld('UserOAuth.bin', { version: 1, username: 'Classic', pass: 'oauth:classic-token' });
    writeOld('web-session.bin', { version: 1, username: 'WebUser', accessToken: 'web-access-token' });
    writeOld('direct-session.bin', { version: 1, username: 'DeviceUser', accessToken: 'device-access-token', refreshToken: 'device-refresh-token' });

    assert.equal(store.getActive(), 'device');
    assert.deepEqual(saved(), {
        version: 2, active: 'device',
        classic: { username: 'Classic', pass: 'oauth:classic-token' },
        web: { username: 'webuser', accessToken: 'web-access-token' },
        device: { username: 'deviceuser', accessToken: 'device-access-token', refreshToken: 'device-refresh-token' },
    });
    assert.equal(fs.existsSync(path.join(directory, 'web-session.bin')), false);
    assert.equal(fs.existsSync(path.join(directory, 'direct-session.bin')), false);
    assert.equal(fs.readFileSync(path.join(directory, 'UserOAuth.bin')).includes('device-refresh-token'), false);
});

test('switching methods keeps other credentials and logout only clears its own section', (t) => {
    const { store, saved } = fixture(t);
    store.set('classic', { username: 'Classic', pass: 'oauth:classic-token' });
    store.set('device', { username: 'Device', accessToken: 'device-access-token', refreshToken: 'device-refresh-token' });
    store.set('web', { username: 'Web', accessToken: 'web-access-token' });
    assert.equal(store.getActive(), 'web');
    store.clear('web');
    assert.equal(store.getActive(), null);
    assert.equal(saved().web, null);
    assert.equal(saved().classic.pass, 'oauth:classic-token');
    assert.equal(saved().device.refreshToken, 'device-refresh-token');
});

test('old Web session takes precedence over classic credentials during migration', (t) => {
    const { store, writeOld } = fixture(t);
    writeOld('UserOAuth.bin', { version: 1, username: 'Classic', pass: 'oauth:classic-token' });
    writeOld('web-session.bin', { version: 1, username: 'WebUser', accessToken: 'web-access-token' });
    assert.equal(store.getActive(), 'web');
});

test('failed migration does not delete the old protected files', (t) => {
    const { directory, safeStorage, store, writeOld } = fixture(t);
    writeOld('web-session.bin', { version: 1, username: 'Web', accessToken: 'web-access-token' });
    safeStorage.encryptString = () => { throw new Error('Encryption failed'); };
    assert.throws(() => store.get('web'), /Encryption failed/);
    assert.equal(fs.existsSync(path.join(directory, 'web-session.bin')), true);
    assert.equal(fs.existsSync(path.join(directory, 'UserOAuth.bin')), false);
});
