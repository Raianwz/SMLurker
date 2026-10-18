const test = require('node:test');
const assert = require('node:assert/strict');
const { backupAndRemoveFailedChannels } = require('../src/components/twitch/channelFailureCleanup');

test('failed channels are removed only after a full JSON backup is written', () => {
    const original = ['#ok', '#falhou', '#outro'];
    const writes = [];
    const appcore = {
        channels: { read: () => original, path: () => 'channels.json' },
        appr: { getPath: () => 'desktop' },
        fs: { write: (file, contents) => writes.push({ file, contents }) },
    };
    const result = backupAndRemoveFailedChannels(appcore, ['#falhou', '#falhou'], new Date(2026, 9, 17, 21, 34, 17, 123));

    assert.deepEqual(result.removed, ['#falhou']);
    assert.match(result.backupPath, /smlurker_backup-channels_2026-10-17_21-34-17-123\.json$/);
    assert.equal(writes[0].file, result.backupPath);
    assert.deepEqual(JSON.parse(writes[0].contents), original);
    assert.equal(writes[1].file, 'channels.json');
    assert.deepEqual(JSON.parse(writes[1].contents), ['#ok', '#outro']);
});

test('a failed backup leaves the channel list untouched', () => {
    const writes = [];
    const appcore = {
        channels: { read: () => ['#falhou'], path: () => 'channels.json' },
        appr: { getPath: () => 'desktop' },
        fs: { write: (file) => { writes.push(file); throw new Error('disk full'); } },
    };
    assert.throws(() => backupAndRemoveFailedChannels(appcore, ['#falhou']), /disk full/);
    assert.equal(writes.length, 1);
    assert.match(writes[0], /smlurker_backup-channels_/);
});
