const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchLiveStatus } = require('../src/components/twitch/liveStatusSource');

test('consults the Dank API once for unique connected channel logins', async () => {
    const requests = [];
    const result = await fetchLiveStatus(['#RaianWZ', 'raianwz', '#outro'], async (url, options) => {
        requests.push({ url, options });
        return { ok: true, json: async () => ({ channels: [
            { login: 'raianwz', is_live: true, stale: false },
            { login: 'outro', is_live: false, stale: false },
        ] }) };
    });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://dank.rwz.app/twitch/streams/status');
    assert.deepEqual(JSON.parse(requests[0].options.body), { logins: ['raianwz', 'outro'] });
    assert.deepEqual(result.map((channel) => channel.is_live), [true, false]);
});

test('falls back to the backup API and reports unknown when neither source responds', async () => {
    const urls = [];
    const result = await fetchLiveStatus(['#canal'], async (url) => {
        urls.push(url);
        throw new Error('offline');
    });
    assert.deepEqual(urls, [
        'https://dank.rwz.app/twitch/streams/status',
        'https://dank-api.vercel.app/twitch/streams/status',
    ]);
    assert.deepEqual(result, [{ login: 'canal', status: 'unknown', is_live: null }]);
});

test('splits large lists into batches accepted by the Dank API', async () => {
    const sizes = [];
    const logins = Array.from({ length: 101 }, (_, index) => `canal_${index}`);
    const result = await fetchLiveStatus(logins, async (_url, options) => {
        const batch = JSON.parse(options.body).logins;
        sizes.push(batch.length);
        return { ok: true, json: async () => ({ channels: batch.map((login) => ({ login, is_live: false })) }) };
    });
    assert.deepEqual(sizes, [100, 1]);
    assert.equal(result.length, 101);
});
