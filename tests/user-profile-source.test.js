const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchUserProfile } = require('../src/components/smdata/userProfileSource');

test('profile source uses the current primary endpoint', async () => {
    const urls = [];
    const profile = { login: 'raianwz' };
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        return { ok: true, json: async () => profile };
    });
    assert.equal(result, profile);
    assert.deepEqual(urls, ['https://api.chat.raianwz.com.br/smlurker/raianwz/']);
});

test('profile source falls back to the existing secondary endpoint', async () => {
    const urls = [];
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        return { ok: urls.length === 2, json: async () => ({ login: 'raianwz' }) };
    });
    assert.equal(result.login, 'raianwz');
    assert.deepEqual(urls, [
        'https://api.chat.raianwz.com.br/smlurker/raianwz/',
        'https://apichatwz.vercel.app/smlurker/raianwz/',
    ]);
});

test('profile source rejects failed responses from both endpoints', async () => {
    await assert.rejects(
        fetchUserProfile('raianwz', async () => ({ ok: false })),
        /Não foi possível consultar o perfil/,
    );
});
