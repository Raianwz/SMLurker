const fs = require('node:fs');
const path = require('node:path');

const SESSION_FILE = 'web-session.bin';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

function createWebSession({ directory, safeStorage, fileSystem = fs, fetchImpl = fetch }) {
    const sessionPath = path.join(directory, SESSION_FILE);

    function encryptionAvailable() {
        return safeStorage.isEncryptionAvailable() &&
            (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
    }

    function clear() {
        if (fileSystem.existsSync(sessionPath)) fileSystem.unlinkSync(sessionPath);
    }

    function save({ username, accessToken }) {
        if (!encryptionAvailable()) return false;
        if (typeof username !== 'string' || !/^[a-z0-9_]{1,25}$/i.test(username) ||
            typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 4096 || /\s/.test(accessToken)) {
            return false;
        }
        const encrypted = safeStorage.encryptString(JSON.stringify({ version: 1, username: username.toLowerCase(), accessToken }));
        fileSystem.mkdirSync(directory, { recursive: true });
        fileSystem.writeFileSync(sessionPath, encrypted, { mode: 0o600 });
        return true;
    }

    async function restore() {
        if (!fileSystem.existsSync(sessionPath)) return { type: 'none' };
        if (!encryptionAvailable()) {
            return { type: 'error', message: 'A proteção da sessão salva não está disponível neste sistema.' };
        }

        let session;
        try {
            session = JSON.parse(safeStorage.decryptString(fileSystem.readFileSync(sessionPath)));
            if (session.version !== 1 || typeof session.username !== 'string' ||
                !/^[a-z0-9_]{1,25}$/i.test(session.username) || typeof session.accessToken !== 'string' ||
                session.accessToken.length < 10 || session.accessToken.length > 4096 || /\s/.test(session.accessToken)) {
                throw new Error('Invalid saved session');
            }
        } catch {
            clear();
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
