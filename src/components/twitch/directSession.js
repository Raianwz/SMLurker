const fs = require('node:fs');
const path = require('node:path');

function createDirectSession({ directory, safeStorage, directLogin, fileSystem = fs }) {
    const sessionPath = path.join(directory, 'direct-session.bin');
    const available = () => safeStorage.isEncryptionAvailable() &&
        (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
    const clear = () => { if (fileSystem.existsSync(sessionPath)) fileSystem.unlinkSync(sessionPath); };
    const valid = (value) => typeof value === 'string' && value.length >= 10 && value.length <= 4096 && !/\s/.test(value);
    function save({ username, accessToken, refreshToken }) {
        if (!available() || !/^[a-z0-9_]{1,25}$/i.test(username || '') || !valid(accessToken) || !valid(refreshToken)) return false;
        const data = safeStorage.encryptString(JSON.stringify({ version: 1, username: username.toLowerCase(), accessToken, refreshToken }));
        fileSystem.mkdirSync(directory, { recursive: true });
        fileSystem.writeFileSync(sessionPath, data, { mode: 0o600 });
        return true;
    }
    async function restore(forceRefresh = false) {
        if (!fileSystem.existsSync(sessionPath)) return { type: 'none' };
        if (!available()) return { type: 'error', message: 'A proteção da sessão direta não está disponível neste sistema.' };
        let saved;
        try {
            saved = JSON.parse(safeStorage.decryptString(fileSystem.readFileSync(sessionPath)));
            if (saved.version !== 1 || !/^[a-z0-9_]{1,25}$/i.test(saved.username || '') || !valid(saved.accessToken) || !valid(saved.refreshToken)) throw new Error('Invalid session');
        } catch {
            clear();
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
