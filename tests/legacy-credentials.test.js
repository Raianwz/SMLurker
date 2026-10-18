const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLegacyCredentials } = require('../src/components/twitch/legacyCredentials');

function fixture(t, available = true) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smlurker-oauth-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const safeStorage = {
        isEncryptionAvailable: () => available,
        getSelectedStorageBackend: () => 'dpapi',
        encryptString: (plain) => Buffer.from(plain).reverse(),
        decryptString: (encrypted) => Buffer.from(encrypted).reverse().toString(),
    };
    return { directory, safeStorage, store: createLegacyCredentials({ directory, safeStorage }) };
}

test('migrates plaintext OAuth and removes the legacy file only after protected storage is readable', (t) => {
    const { directory, store } = fixture(t);
    const original = { username: 'raianwz', pass: 'oauth:private-token' };
    fs.writeFileSync(path.join(directory, 'credentials.json'), JSON.stringify(original));

    assert.deepEqual(store.load(), { credentials: original, protectionPending: false });
    assert.equal(fs.existsSync(path.join(directory, 'credentials.json')), false);
    assert.equal(fs.readFileSync(path.join(directory, 'UserOAuth.bin')).includes('private-token'), false);
    assert.deepEqual(store.load(), { credentials: original, protectionPending: false });
});

test('keeps legacy login available when system encryption is unavailable', (t) => {
    const { directory, store } = fixture(t, false);
    const original = { username: 'raianwz', pass: 'oauth:private-token' };
    fs.writeFileSync(path.join(directory, 'credentials.json'), JSON.stringify(original));

    assert.deepEqual(store.load(), { credentials: original, protectionPending: true });
    assert.equal(store.save(original), false);
    assert.equal(fs.existsSync(path.join(directory, 'credentials.json')), true);
    assert.equal(fs.existsSync(path.join(directory, 'UserOAuth.bin')), false);
});

test('failed encryption leaves the plaintext file for a later migration attempt', (t) => {
    const { directory, safeStorage } = fixture(t);
    const original = { username: 'raianwz', pass: 'oauth:private-token' };
    fs.writeFileSync(path.join(directory, 'credentials.json'), JSON.stringify(original));
    safeStorage.encryptString = () => { throw new Error('key unavailable'); };
    const store = createLegacyCredentials({ directory, safeStorage });

    assert.deepEqual(store.load(), { credentials: original, protectionPending: true });
    assert.equal(fs.existsSync(path.join(directory, 'credentials.json')), true);
    assert.equal(fs.existsSync(path.join(directory, 'UserOAuth.bin')), false);
});

test('protected credentials take precedence over a leftover plaintext copy', (t) => {
    const { directory, store } = fixture(t);
    const current = { username: 'newuser', pass: 'oauth:new-token' };
    assert.equal(store.save(current), true);
    fs.writeFileSync(path.join(directory, 'credentials.json'), JSON.stringify({ username: 'olduser', pass: 'oauth:old-token' }));

    assert.deepEqual(store.load(), { credentials: current, protectionPending: false });
    assert.equal(fs.existsSync(path.join(directory, 'credentials.json')), false);
});

test('an unreadable protected file does not erase recoverable legacy credentials', (t) => {
    const { directory, store } = fixture(t);
    const original = { username: 'raianwz', pass: 'oauth:private-token' };
    fs.writeFileSync(path.join(directory, 'UserOAuth.bin'), 'invalid');
    fs.writeFileSync(path.join(directory, 'credentials.json'), JSON.stringify(original));

    assert.deepEqual(store.load(), { credentials: original, protectionPending: true });
    assert.equal(fs.existsSync(path.join(directory, 'credentials.json')), true);
});
