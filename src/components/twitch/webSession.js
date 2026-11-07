const { createAuthStore } = require('./authStore');

const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

function createWebSession({ directory, safeStorage, fileSystem, fetchImpl = fetch }) {
    const store = createAuthStore({ directory, safeStorage, fileSystem });
    const clear = () => store.clear('web');

    function save({ username, accessToken }) {
        if (typeof username !== 'string' || !/^[a-z0-9_]{1,25}$/i.test(username) ||
            typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 4096 || /\s/.test(accessToken)) return false;
        return store.set('web', { username, accessToken });
    }

    async function restore() {
        let session;
        try {
            if (!store.available()) return { type: 'error', message: 'A proteção da sessão salva não está disponível neste sistema.' };
            if (store.getActive() !== 'web') return { type: 'none' };
            session = store.get('web');
            if (!session) return { type: 'none' };
        } catch {
            return { type: 'error', requiresLogin: true, message: 'A sessão salva não pôde ser lida. Entre com a Twitch novamente.' };
        }

        try {
            const response = await fetchImpl(VALIDATE_URL, {
                headers: { Authorization: `OAuth ${session.accessToken}` },
                signal: AbortSignal.timeout(10000),
            });
            if (response.status === 401) {
                clear();
                return { type: 'error', requiresLogin: true, message: 'A sessão da Twitch expirou. Entre novamente.' };
            }
            if (!response.ok) throw new Error('Token validation unavailable');
            const validation = await response.json();
            if (validation.login?.toLowerCase() !== session.username ||
                !Number.isFinite(validation.expires_in) || validation.expires_in <= 0) {
                clear();
                return { type: 'error', requiresLogin: true, message: 'A sessão da Twitch não é mais válida. Entre novamente.' };
            }
            return { type: 'success', username: session.username, accessToken: session.accessToken };
        } catch {
            return { type: 'error', message: 'Não foi possível verificar a sessão salva. Tente novamente quando estiver online.' };
        }
    }

    return { save, restore, clear };
}

module.exports = { createWebSession };
