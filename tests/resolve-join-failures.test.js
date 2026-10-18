const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveJoinFailures } = require('../src/components/twitch/resolveJoinFailures');

test('fresh not_found removes a missing login while offline and unknown remain selected', async () => {
    const uncertain = { code: 'no_response', label: 'sem resposta da Twitch' };
    const failures = ['#live', '#offline', '#bast_50', '#unknown', '#stale'].map(channel => ({ channel, reason: uncertain }));
    failures.push({ channel: '#suspended', reason: { code: 'suspended', label: 'canal suspenso ou removido' } });
    const result = await resolveJoinFailures(failures, async (channels) => {
        assert.deepEqual(channels, ['#live', '#offline', '#bast_50', '#unknown', '#stale']);
        return [
            { login: 'live', status: 'live', stale: false },
            { login: 'offline', status: 'offline', stale: false },
            { login: 'bast_50', status: 'not_found', stale: false },
            { login: 'unknown', status: 'unknown', stale: false },
            { login: 'stale', status: 'not_found', stale: true },
        ];
    });
    assert.deepEqual(result.remove, ['#bast_50', '#suspended']);
    assert.deepEqual(result.existing, ['#live', '#offline']);
    assert.deepEqual(result.unknown, ['#unknown', '#stale']);
    assert.deepEqual(result.missingLogin, ['#bast_50']);
});

test('a failed lookup keeps timeout channels for later retry', async () => {
    const result = await resolveJoinFailures([
        { channel: '#timeout', reason: { code: 'other', label: 'tempo esgotado' } },
    ], async () => []);
    assert.deepEqual(result.remove, []);
    assert.deepEqual(result.unknown, ['#timeout']);
});
