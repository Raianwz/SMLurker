const { createAuthStore } = require('./authStore');

function createDirectSession({ directory, safeStorage, directLogin, fileSystem }) {
    const store = createAuthStore({ directory, safeStorage, fileSystem });
    const clear = () => store.clear('device');
    function save({ username, accessToken, refreshToken }) {
        return store.set('device', { username, accessToken, refreshToken });
    }
    async function restore(forceRefresh = false) {
        let saved;
        try {
            if (!store.available()) return { type: 'error', message: 'A proteção da sessão direta não está disponível neste sistema.' };
            if (store.getActive() !== 'device') return { type: 'none' };
            saved = store.get('device');
            if (!saved) return { type: 'none' };
        } catch {
            return { type: 'error', requiresLogin: true, message: 'A sessão direta salva não pôde ser lida. Entre novamente.' };
        }
        try {
            let username = forceRefresh ? null : await directLogin.validate(saved.accessToken);
            if (!username || username !== saved.username) {
                const renewed = await directLogin.refresh(saved.refreshToken);
                username = await directLogin.validate(renewed.access_token);
                if (username !== saved.username) throw new Error('Invalid account');
                saved.accessToken = renewed.access_token;
                saved.refreshToken = renewed.refresh_token;
                if (!save(saved)) throw new Error('Could not persist rotated token');
            }
            return { type: 'success', source: 'direct', username, accessToken: saved.accessToken };
        } catch (error) {
            if (/expirou|Invalid account|persist rotated/i.test(error.message)) {
                clear();
                return { type: 'error', requiresLogin: true, message: 'A sessão direta expirou. Faça login novamente.' };
            }
            return { type: 'error', message: 'Não foi possível verificar a sessão direta. Tente novamente quando estiver online.' };
        }
    }
    return { save, restore, renew: () => restore(true), clear };
}

module.exports = { createDirectSession };
