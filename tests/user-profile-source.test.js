const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchUserProfile } = require('../src/components/smdata/userProfileSource');

const profile = {
    login: 'raianwz', display_name: 'Raian',
    profile_image_url: 'https://example.com/avatar.png', chatColor: '#9148FF',
};
const dankUrl = 'https://dank.example.com';
const legacyUrl = 'https://apichatwz.vercel.app/smlurker/raianwz/';

test('Dank API is the primary profile source', async () => {
    const urls = [];
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        return { ok: true, json: async () => profile };
    }, dankUrl);
    assert.equal(result, profile);
    assert.deepEqual(urls, [`${dankUrl}/twitch/user/raianwz`]);
});

test('network failure on the preferred Dank domain tries its reserve', async () => {
    const urls = [];
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        if (urls.length === 1) throw new Error('offline');
        return { ok: true, json: async () => profile };
    }, dankUrl);
    assert.equal(result, profile);
    assert.deepEqual(urls, [
        `${dankUrl}/twitch/user/raianwz`,
        'https://dank-api.vercel.app/twitch/user/raianwz',
    ]);
});

test('legacy Vercel API is used only after both Dank URLs fail', async () => {
    const urls = [];
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        if (urls.length === 1) return { ok: true, json: async () => ({ login: 'raianwz' }) };
        if (urls.length === 2) return { ok: false };
        return { ok: true, json: async () => profile };
    }, `${dankUrl}/`);
    assert.equal(result, profile);
    assert.deepEqual(urls, [
        `${dankUrl}/twitch/user/raianwz`,
        'https://dank-api.vercel.app/twitch/user/raianwz',
        legacyUrl,
    ]);
});

test('all failed profile sources reject the request', async () => {
    await assert.rejects(
        fetchUserProfile('raianwz', async () => ({ ok: false }), dankUrl),
        /Não foi possível consultar o perfil/,
    );
});

test('rwz.app is preferred, vercel.app is reserve, and legacy is last', async () => {
    const previous = process.env.SMLURKER_DANK_API_URL;
    delete process.env.SMLURKER_DANK_API_URL;
    const urls = [];
    try {
        await assert.rejects(fetchUserProfile('raianwz', async (url) => {
            urls.push(url);
            return { ok: false };
        }));
        assert.deepEqual(urls, [
            'https://dank.rwz.app/twitch/user/raianwz',
            'https://dank-api.vercel.app/twitch/user/raianwz',
            legacyUrl,
        ]);
    } finally {
        if (previous === undefined) delete process.env.SMLURKER_DANK_API_URL;
        else process.env.SMLURKER_DANK_API_URL = previous;
    }
});

test('a Dank API rate limit skips its alias but still tries the legacy API', async () => {
    const urls = [];
    const result = await fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        return urls.length === 1
            ? { ok: false, status: 429 }
            : { ok: true, json: async () => profile };
    }, dankUrl);
    assert.equal(result, profile);
    assert.deepEqual(urls, [`${dankUrl}/twitch/user/raianwz`, legacyUrl]);
});

test('configured reserve URL is queried only once before legacy', async () => {
    const urls = [];
    await assert.rejects(fetchUserProfile('raianwz', async (url) => {
        urls.push(url);
        return { ok: false };
    }, 'https://dank-api.vercel.app/'));
    assert.deepEqual(urls, [
        'https://dank-api.vercel.app/twitch/user/raianwz',
        legacyUrl,
    ]);
});
