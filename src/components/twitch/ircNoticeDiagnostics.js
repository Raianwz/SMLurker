function formatIrcNotice(message) {
    if (message?.command !== 'NOTICE') return null;

    const rawChannel = message.params?.[0];
    const channel = typeof rawChannel === 'string' && (/^#[a-z0-9_]{1,25}$/i.test(rawChannel) || rawChannel === '*')
        ? rawChannel.toLowerCase() : '*';
    const rawId = message.tags?.['msg-id'];
    const id = typeof rawId === 'string' && /^[a-z0-9_]{1,80}$/i.test(rawId)
        ? rawId : 'sem msg-id';
    const rawText = message.params?.[1];
    const detail = typeof rawText === 'string'
        ? rawText.replace(/[\r\n\t]/g, ' ').replace(/\boauth:\S+|\bBearer\s+\S+|\baccess_token=\S+/gi, '[redigido]').slice(0, 200)
        : '';

    return `IRC NOTICE ${channel} [${id}]${detail ? `: ${detail}` : ''}`;
}

function observeIrcNotices(client, report) {
    client.on('raw_message', (message) => {
        const notice = formatIrcNotice(message);
        if (notice) report(notice);
    });
}

module.exports = { formatIrcNotice, observeIrcNotices };
