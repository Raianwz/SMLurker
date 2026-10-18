const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyJoinFailure } = require('../src/components/twitch/joinFailure');

test('join errors distinguish Twitch notices from missing responses', () => {
    assert.deepEqual(classifyJoinFailure('msg_channel_suspended'),
        { code: 'suspended', label: 'canal suspenso' });
    assert.deepEqual(classifyJoinFailure(new Error('msg_room_not_found')),
        { code: 'not_found', label: 'canal não encontrado' });
    assert.deepEqual(classifyJoinFailure('No response from Twitch.'),
        { code: 'no_response', label: 'sem resposta da Twitch' });
    assert.deepEqual(classifyJoinFailure(new Error('Tempo esgotado ao entrar em #canal.')),
        { code: 'other', label: 'tempo esgotado' });
});
