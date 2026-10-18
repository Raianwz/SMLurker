const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PROTECTED_FILE = 'UserOAuth.bin';
const LEGACY_FILE = 'credentials.json';

function createLegacyCredentials({ directory, safeStorage, fileSystem = fs }) {
    const protectedPath = path.join(directory, PROTECTED_FILE);
    const legacyPath = path.join(directory, LEGACY_FILE);

    function encryptionAvailable() {
        return safeStorage.isEncryptionAvailable() &&
            (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
    }

    function valid(data) {
        return data && typeof data.username === 'string' && data.username.trim() &&
            typeof data.pass === 'string' && data.pass.trim();
    }

    function readLegacy() {
        const data = JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8'));
        if (!valid(data)) throw new Error('Credenciais legadas inválidas.');
        return { username: data.username, pass: data.pass };
    }

    function readProtected() {
        const data = JSON.parse(safeStorage.decryptString(fileSystem.readFileSync(protectedPath)));
        if (data.version !== 1 || !valid(data)) throw new Error('Credenciais protegidas inválidas.');
        return { username: data.username, pass: data.pass };
    }

    function save({ username, pass }) {
        if (!valid({ username, pass })) throw new Error('Credenciais inválidas.');
        if (!encryptionAvailable()) return false;
        const encrypted = safeStorage.encryptString(JSON.stringify({ version: 1, username, pass }));
        // Confirme a leitura antes de substituir o arquivo anterior ou remover o legado.
        const checked = JSON.parse(safeStorage.decryptString(encrypted));
        if (checked.version !== 1 || checked.username !== username || checked.pass !== pass) {
            throw new Error('Não foi possível confirmar a proteção das credenciais.');
        }
        fileSystem.mkdirSync(directory, { recursive: true });
        const temporaryPath = path.join(directory, `${PROTECTED_FILE}.${randomUUID()}.tmp`);
        try {
            fileSystem.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
            const persisted = JSON.parse(safeStorage.decryptString(fileSystem.readFileSync(temporaryPath)));
            if (persisted.version !== 1 || persisted.username !== username || persisted.pass !== pass) {
                throw new Error('Não foi possível verificar o arquivo protegido.');
            }
            fileSystem.renameSync(temporaryPath, protectedPath);
        } finally {
            if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath);
        }
        if (fileSystem.existsSync(legacyPath)) fileSystem.unlinkSync(legacyPath);
        return true;
    }

    function load() {
        const hasLegacy = fileSystem.existsSync(legacyPath);
        if (fileSystem.existsSync(protectedPath)) {
            if (!encryptionAvailable()) {
                if (hasLegacy) return { credentials: readLegacy(), protectionPending: true };
                throw new Error('A proteção das credenciais não está disponível neste sistema.');
            }
            try {
                const credentials = readProtected();
                if (hasLegacy) fileSystem.unlinkSync(legacyPath);
                return { credentials, protectionPending: false };
            } catch (error) {
                if (hasLegacy) return { credentials: readLegacy(), protectionPending: true };
                throw error;
            }
        }
        if (!hasLegacy) return { credentials: null, protectionPending: false };
        const credentials = readLegacy();
        try {
            return { credentials, protectionPending: !save(credentials) };
        } catch {
            // A migração pode ser repetida; o login existente continua disponível.
            return { credentials, protectionPending: true };
        }
    }

    return { load, save };
}

module.exports = { createLegacyCredentials };
