const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');

const APP_ID = 'com.smlurker';
const PROTOCOL = 'smlurker';
const CALLBACK_URL = `${PROTOCOL}://auth/callback`;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const COMPLETION_TIMEOUT_MS = 3000;
const DEFAULT_WEB_ORIGIN = 'https://web.smlurker.rwz.app';
const DEV_FALLBACK_ORIGIN = 'https://smlurker.vercel.app';
const LOCAL_PROBE_TIMEOUT_MS = 1500;

function webOrigin(isPackaged, configuredUrl = process.env.SMLURKER_WEB_URL) {
    const rawUrl = configuredUrl || (isPackaged ? DEFAULT_WEB_ORIGIN : 'http://localhost:3000');

    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('A URL do SMLurker Web é inválida.');
    }

    const localDev = !isPackaged && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localDev) {
        throw new Error('O login pelo navegador exige HTTPS, exceto no desenvolvimento local.');
    }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        throw new Error('Configure apenas a origem do SMLurker Web, sem caminho ou parâmetros.');
    }
    return url.origin;
}

function callbackFromUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048) return null;
    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }
    if (url.protocol !== `${PROTOCOL}:` || url.host !== 'auth' || url.pathname !== '/callback' || url.hash) return null;
    if (url.searchParams.has('access_token') || url.searchParams.has('refresh_token')) return null;
    return {
        code: url.searchParams.get('code'),
        state: url.searchParams.get('state'),
        error: url.searchParams.get('error'),
    };
}

function callbackFromArgs(args) {
    return args.find((arg) => callbackFromUrl(arg)) || null;
}

function sameState(received, expected) {
    if (typeof received !== 'string') return false;
    const left = Buffer.from(received);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
}

function validateCredentials(payload) {
    const login = payload?.user?.login;
    const accessToken = payload?.accessToken;
    if (typeof login !== 'string' || !/^[a-z0-9_]{1,25}$/i.test(login) ||
        typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 4096 ||
        /^oauth:/i.test(accessToken) || /\s/.test(accessToken)) {
        throw new Error('O SMLurker Web não retornou credenciais válidas.');
    }
    return { username: login.toLowerCase(), accessToken };
}

async function exchangeCode(origin, code, verifier, fetchImpl = fetch) {
    const response = await fetchImpl(`${origin}/api/apps/${APP_ID}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, codeVerifier: verifier, redirectUri: CALLBACK_URL }),
        signal: AbortSignal.timeout(10000),
    });
    if (response.status === 501) throw new Error('A vinculação com o SMLurker Web ainda não está disponível.');
    if (!response.ok) throw new Error('Não foi possível validar o login no SMLurker Web.');
    const payload = await response.json();
    return {
        credentials: validateCredentials(payload),
        completionToken: typeof payload.completionToken === 'string' &&
            /^[A-Za-z0-9_-]{43,128}$/.test(payload.completionToken)
            ? payload.completionToken : null,
    };
}

async function confirmLogin(origin, completionToken, fetchImpl) {
    try {
        await fetchImpl(`${origin}/api/apps/${APP_ID}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completionToken }),
            signal: AbortSignal.timeout(COMPLETION_TIMEOUT_MS),
        });
    } catch { /* A confirmação visual da aba não impede o login no aplicativo. */ }
}

function createWebLogin({ isPackaged, openExternal, onResult, fetchImpl = fetch, probeImpl = fetch,
    now = Date.now, configuredUrl = process.env.SMLURKER_WEB_URL }) {
    let pending = null;

    return {
        async start() {
            let origin = webOrigin(isPackaged, configuredUrl);
            if (!isPackaged && !configuredUrl && origin === 'http://localhost:3000') {
                try {
                    await probeImpl(origin, {
                        method: 'HEAD',
                        signal: AbortSignal.timeout(LOCAL_PROBE_TIMEOUT_MS),
                    });
                } catch {
                    origin = DEV_FALLBACK_ORIGIN;
                }
            }
            const state = randomBytes(32).toString('base64url');
            const verifier = randomBytes(32).toString('base64url');
            const challenge = createHash('sha256').update(verifier).digest('base64url');
            const url = new URL(`/connect/apps/${APP_ID}`, origin);
            url.searchParams.set('state', state);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');
            url.searchParams.set('redirect_uri', CALLBACK_URL);

            pending = { state, verifier, origin, expiresAt: now() + LOGIN_TIMEOUT_MS };
            try {
                await openExternal(url.toString());
            } catch {
                pending = null;
                throw new Error('Não foi possível abrir o SMLurker Web no navegador.');
            }
        },

        async handleCallback(rawUrl) {
            const callback = callbackFromUrl(rawUrl);
            if (!callback) return false;
            if (!pending) {
                onResult({ type: 'error', message: 'Este link de login já foi usado ou pertence a uma tentativa anterior. Para entrar novamente, inicie o login pelo aplicativo.' });
                return true;
            }
            if (now() > pending.expiresAt) {
                pending = null;
                onResult({ type: 'error', message: 'O login pelo navegador expirou. Inicie novamente.' });
                return true;
            }
            if (!sameState(callback.state, pending.state)) {
                onResult({ type: 'error', message: 'A confirmação do login não corresponde a esta tentativa.' });
                return true;
            }

            const current = pending;
            pending = null;
            if (callback.error) {
                onResult({ type: 'error', message: 'O login pelo navegador foi cancelado ou recusado.' });
                return true;
            }
            if (!callback.code || !/^[a-zA-Z0-9_-]{16,512}$/.test(callback.code)) {
                onResult({ type: 'error', message: 'O navegador não retornou um código de login válido.' });
                return true;
            }

            try {
                const { credentials, completionToken } = await exchangeCode(current.origin, callback.code, current.verifier, fetchImpl);
                const accepted = onResult({ type: 'success', ...credentials });
                if (accepted === true && completionToken) {
                    await confirmLogin(current.origin, completionToken, fetchImpl);
                }
            } catch (error) {
                const message = error instanceof Error && error.message.startsWith('A vinculação')
                    ? error.message
                    : 'Não foi possível concluir o login pelo navegador.';
                onResult({ type: 'error', message });
            }
            return true;
        },
    };
}

module.exports = { PROTOCOL, callbackFromArgs, callbackFromUrl, createWebLogin, webOrigin };
