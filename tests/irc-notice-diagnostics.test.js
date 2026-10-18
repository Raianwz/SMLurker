const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { formatIrcNotice, observeIrcNotices } = require('../src/components/twitch/ircNoticeDiagnostics');

test('IRC diagnostics report Twitch notices before library classification', () => {
    const client = new EventEmitter();
    const reported = [];
    observeIrcNotices(client, (notice) => reported.push(notice));
    client.emit('raw_message', {
        command: 'NOTICE', tags: { 'msg-id': 'msg_channel_suspended' },
        params: ['#Canal', 'This channel does not exist or has been suspended.'],
    });
    client.emit('raw_message', { command: 'PRIVMSG', params: ['#canal', 'private chat'] });
    assert.deepEqual(reported, [
        'IRC NOTICE #canal [msg_channel_suspended]: This channel does not exist or has been suspended.',
    ]);
});

test('IRC diagnostics redact credentials and bound unknown notices', () => {
    assert.equal(formatIrcNotice({ command: 'NOTICE', params: ['*', 'oauth:secret-token\nBearer secret-token'] }),
        'IRC NOTICE * [sem msg-id]: [redigido] [redigido]');
    assert.equal(formatIrcNotice({ command: 'NOTICE', tags: { 'msg-id': 'invalid\ncode' },
        params: ['#channel\nmalformed', 'a'.repeat(300)] }),
    `IRC NOTICE * [sem msg-id]: ${'a'.repeat(200)}`);
    assert.equal(formatIrcNotice({ command: 'PING' }), null);
});
