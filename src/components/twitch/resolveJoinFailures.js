async function resolveJoinFailures(failures, lookup) {
    const uncertain = failures.filter(({ reason }) => reason.code === 'no_response' || reason.label === 'tempo esgotado');
    const statuses = uncertain.length ? await lookup(uncertain.map(({ channel }) => channel)) : [];
    const byLogin = new Map(statuses.map((status) => [status.login, status]));
    const remove = [];
    const existing = [];
    const unknown = [];
    const missingLogin = [];

    for (const { channel, reason } of failures) {
        if (reason.code !== 'no_response' && reason.label !== 'tempo esgotado') {
            remove.push(channel);
            continue;
        }
        const status = byLogin.get(channel.replace(/^#/, '').toLowerCase());
        if (status?.status === 'not_found' && status.stale === false) {
            remove.push(channel);
            missingLogin.push(channel);
        } else if ((status?.status === 'live' || status?.status === 'offline') && status.stale === false) {
            existing.push(channel);
        } else {
            unknown.push(channel);
        }
    }

    return { remove, existing, unknown, missingLogin };
}

module.exports = { resolveJoinFailures };
