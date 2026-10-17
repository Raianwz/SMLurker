const DEFAULT_DANK_API_URL = 'https://dank.rwz.app';
const BACKUP_DANK_API_URL = 'https://dank-api.vercel.app';
const REQUEST_TIMEOUT_MS = 5000;
const BATCH_SIZE = 100;

async function fetchLiveStatus(logins, fetchImpl = fetch, preferredUrl = process.env.SMLURKER_DANK_API_URL || DEFAULT_DANK_API_URL) {
    if (!Array.isArray(logins) || logins.some((login) => typeof login !== 'string')) {
        throw new TypeError('Lista de canais inválida.');
    }
    const names = [...new Set(logins.map((login) => login.replace(/^#/, '').toLowerCase()))];
    if (names.some((login) => !/^[a-z0-9_]{1,25}$/.test(login))) {
        throw new TypeError('Lista de canais inválida.');
    }
    if (!names.length) return [];

    const primary = typeof preferredUrl === 'string' && /^https:\/\//.test(preferredUrl)
        ? preferredUrl.replace(/\/+$/, '') : DEFAULT_DANK_API_URL;
    const sources = [...new Set([primary, BACKUP_DANK_API_URL])];
    const channels = [];

    for (let offset = 0; offset < names.length; offset += BATCH_SIZE) {
        const batch = names.slice(offset, offset + BATCH_SIZE);
        let result = null;
        for (const source of sources) {
            try {
                const response = await fetchImpl(`${source}/twitch/streams/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logins: batch }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                if (response.ok) {
                    const body = await response.json();
                    if (Array.isArray(body?.channels) && body.channels.length === batch.length &&
                        body.channels.every((channel, index) => channel?.login === batch[index] &&
                            [true, false, null].includes(channel.is_live))) {
                        result = body.channels;
                        break;
                    }
                }
                if (response.status === 429) break;
            } catch {
                // A próxima fonte pode responder quando esta estiver indisponível.
            }
        }
        channels.push(...(result || batch.map((login) => ({ login, status: 'unknown', is_live: null }))));
    }
    return channels;
}

module.exports = { fetchLiveStatus };
