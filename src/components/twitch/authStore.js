const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const FILE = 'UserOAuth.bin';
const METHODS = ['classic', 'web', 'device'];
const OLD_FILES = { web: 'web-session.bin', device: 'direct-session.bin' };

function createAuthStore({ directory, safeStorage, fileSystem = fs }) {
    const storePath = path.join(directory, FILE);
    const available = () => safeStorage.isEncryptionAvailable() &&
        (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
    const empty = () => ({ version: 2, active: null, classic: null, web: null, device: null });
    const validToken = (value) => typeof value === 'string' && value.length >= 10 && value.length <= 4096 && !/\s/.test(value);
    const validUser = (value) => typeof value === 'string' && /^[a-z0-9_]{1,25}$/i.test(value);

    function valid(method, value) {
        if (!value || !validUser(value.username)) return false;
        if (method === 'classic') return typeof value.pass === 'string' && Boolean(value.pass.trim());
        if (!validToken(value.accessToken)) return false;
        return method !== 'device' || validToken(value.refreshToken);
    }

    function normalize(method, value) {
        if (!valid(method, value)) throw new Error(`Invalid ${method} credentials`);
        if (method === 'classic') return { username: value.username, pass: value.pass };
        const result = { username: value.username.toLowerCase(), accessToken: value.accessToken };
        if (method === 'device') result.refreshToken = value.refreshToken;
        return result;
    }

    function decrypt(file) {
        return JSON.parse(safeStorage.decryptString(fileSystem.readFileSync(file)));
    }

    function write(document) {
        const encrypted = safeStorage.encryptString(JSON.stringify(document));
        fileSystem.mkdirSync(directory, { recursive: true });
        const temporaryPath = path.join(directory, `${FILE}.${randomUUID()}.tmp`);
        try {
            fileSystem.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
            if (JSON.stringify(decrypt(temporaryPath)) !== JSON.stringify(document)) throw new Error('Saved credentials could not be verified');
            fileSystem.renameSync(temporaryPath, storePath);
        } finally {
            if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath);
        }
    }

    function read() {
        if (!available()) throw new Error('Protected storage is unavailable');
        let document = empty();
        let changed = false;
        if (fileSystem.existsSync(storePath)) {
            const saved = decrypt(storePath);
            if (saved.version === 1 && valid('classic', saved)) {
                document.classic = normalize('classic', saved);
                document.active = 'classic';
                changed = true;
            } else if (saved.version === 2 && METHODS.every((method) => saved[method] == null || valid(method, saved[method])) &&
                (saved.active == null || METHODS.includes(saved.active))) {
                document = { ...empty(), ...saved };
            } else {
                throw new Error('Invalid protected credentials');
            }
        }

        const migrated = [];
        for (const [method, filename] of Object.entries(OLD_FILES)) {
            const oldPath = path.join(directory, filename);
            if (!fileSystem.existsSync(oldPath)) continue;
            const old = decrypt(oldPath);
            if (old.version !== 1 || !valid(method, old)) throw new Error(`Invalid ${method} session`);
            if (!document[method]) {
                document[method] = normalize(method, old);
                // Previously a saved direct session took priority, then Web, then classic.
                if (!document.active || method === 'device' || (method === 'web' && document.active === 'classic')) {
                    document.active = method;
                }
                changed = true;
            }
            migrated.push(oldPath);
        }

        const legacyPath = path.join(directory, 'credentials.json');
        if (fileSystem.existsSync(legacyPath)) {
            let old;
            try { old = JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8')); }
            catch (error) { if (!document.classic) throw error; }
            if (!valid('classic', old) && !document.classic) throw new Error('Invalid legacy credentials');
            if (valid('classic', old) && !document.classic) {
                document.classic = normalize('classic', old);
                if (!document.active) document.active = 'classic';
                changed = true;
            }
            if (valid('classic', old)) migrated.push(legacyPath);
        }

        if (changed || migrated.length) write(document);
        for (const oldPath of migrated) fileSystem.unlinkSync(oldPath);
        return document;
    }

    function get(method) {
        if (!METHODS.includes(method)) throw new Error('Unknown login method');
        return read()[method];
    }

    function getActive() { return read().active; }

    function set(method, value) {
        if (!METHODS.includes(method)) throw new Error('Unknown login method');
        if (!available()) return false;
        const normalized = normalize(method, value);
        const document = read();
        document[method] = normalized;
        document.active = method;
        write(document);
        return true;
    }

    function clear(method) {
        if (!METHODS.includes(method)) throw new Error('Unknown login method');
        if (!available()) throw new Error('Protected storage is unavailable');
        const document = read();
        if (!document[method]) return;
        document[method] = null;
        if (document.active === method) document.active = null;
        write(document);
    }

    return { available, get, getActive, set, clear };
}

module.exports = { createAuthStore };
