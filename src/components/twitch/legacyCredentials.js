const fs = require('node:fs');
const path = require('node:path');
const { createAuthStore } = require('./authStore');

function createLegacyCredentials({ directory, safeStorage, fileSystem = fs }) {
    const store = createAuthStore({ directory, safeStorage, fileSystem });
    const legacyPath = path.join(directory, 'credentials.json');

    function readPlaintext() {
        const old = JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8'));
        if (!old || typeof old.username !== 'string' || !old.username.trim() ||
            typeof old.pass !== 'string' || !old.pass.trim()) throw new Error('Credenciais legadas inválidas.');
        return { credentials: { username: old.username, pass: old.pass }, protectionPending: true };
    }

    function load() {
        if (!store.available()) {
            if (fileSystem.existsSync(legacyPath)) return readPlaintext();
            if (fileSystem.existsSync(path.join(directory, 'UserOAuth.bin'))) {
                throw new Error('A proteção das credenciais não está disponível neste sistema.');
            }
            return { credentials: null, protectionPending: false };
        }
        try {
            return { credentials: store.get('classic'), protectionPending: false };
        } catch (error) {
            if (!fileSystem.existsSync(legacyPath)) throw error;
            return readPlaintext();
        }
    }

    function save(values) { return store.set('classic', values); }
    return { load, save };
}

module.exports = { createLegacyCredentials };
