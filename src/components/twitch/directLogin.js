const DEVICE_URL = 'https://id.twitch.tv/oauth2/device';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

function readClientId({ isPackaged = false, appRoot = process.cwd(), fileSystem = require('node:fs'), path = require('node:path') } = {}) {
    const fromEnvironment = process.env.SMELECTRON_CLIENT_ID;
    if (fromEnvironment) return fromEnvironment.trim();
    if (isPackaged) {
        try { return require('./directClientId.json').clientId; } catch { return ''; }
    }
    try {
        const envFile = fileSystem.readFileSync(path.join(appRoot, '.env.production'), 'utf8');
        return envFile.match(/^CLIENT_ID\s*=\s*([^\s#]+)\s*$/m)?.[1] || '';
    } catch { return ''; }
}

function createDirectLogin({ clientId, fetchImpl = fetch, wait = (ms, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Login cancelado.')); }, { once: true });
}) }) {
    if (!/^[a-z0-9]{10,100}$/i.test(clientId || '')) throw new Error('CLIENT_ID do Electron não configurado.');

    async function request(url, params, signal) {
        const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
            signal: requestSignal,
        });
        const data = await response.json();
        return { response, data };
    }

    async function begin(signal) {
        const { response, data } = await request(DEVICE_URL, { client_id: clientId, scopes: 'chat:read' }, signal);
        if (!response.ok || !data.device_code || !data.user_code || !data.verification_uri) throw new Error('A Twitch não iniciou o login direto.');
        const uri = new URL(data.verification_uri);
        if (uri.protocol !== 'https:' || !['twitch.tv', 'www.twitch.tv'].includes(uri.hostname)) throw new Error('Endereço de ativação inválido.');
        return {
            deviceCode: data.device_code,
            userCode: data.user_code,
            verificationUri: uri.toString(),
            expiresIn: Math.min(Math.max(Number(data.expires_in) || 600, 1), 1800),
            interval: Math.max(Number(data.interval) || 5, 5),
        };
    }

    async function poll(device, signal) {
        const deadline = Date.now() + device.expiresIn * 1000;
        let interval = device.interval;
        while (Date.now() < deadline) {
            await wait(interval * 1000, signal);
            if (signal?.aborted) throw new Error('Login cancelado.');
            const { response, data } = await request(TOKEN_URL, {
                client_id: clientId, scopes: 'chat:read', device_code: device.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }, signal);
            if (response.ok && data.access_token && data.refresh_token) return data;
            if (data.message === 'authorization_pending' || data.error === 'authorization_pending') continue;
            if (data.message === 'slow_down' || data.error === 'slow_down') { interval += 5; continue; }
            if (data.message === 'access_denied' || data.error === 'access_denied') throw new Error('Autorização recusada na Twitch.');
            if (data.message === 'expired_token' || data.error === 'expired_token') break;
            throw new Error('A Twitch não concluiu o login direto.');
        }
        throw new Error('O código de ativação expirou. Tente novamente.');
    }

    async function validate(accessToken) {
        const response = await fetchImpl(VALIDATE_URL, { headers: { Authorization: `OAuth ${accessToken}` }, signal: AbortSignal.timeout(10000) });
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Não foi possível verificar a sessão com a Twitch.');
        const data = await response.json();
        if (data.client_id !== clientId || !/^[a-z0-9_]{1,25}$/i.test(data.login || '') || !Number.isFinite(data.expires_in) || data.expires_in <= 0) return null;
        return data.login.toLowerCase();
    }

    async function refresh(refreshToken) {
        const { response, data } = await request(TOKEN_URL, {
            client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken,
        });
        if (!response.ok || !data.access_token || !data.refresh_token) {
            if (response.status === 400 || response.status === 401) throw new Error('A sessão direta expirou. Faça login novamente.');
            throw new Error('A Twitch não conseguiu renovar a sessão direta. Tente novamente.');
        }
        return data;
    }

    return { begin, poll, validate, refresh };
}

module.exports = { createDirectLogin, readClientId };
