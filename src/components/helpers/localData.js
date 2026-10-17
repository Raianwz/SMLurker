const fs = require('node:fs');
const path = require('node:path');
const { getChannelsFilePath, readChannelsFile } = require('./channelFile');

const DEFAULT_PREFERENCES = {
    ini: false,
    autologin: false,
    inimin: false,
    NotifyMe: false,
    NotifyGift: false,
    NotifyTray: false,
    appearance: 'modern',
};

function normalizeChannels(values) {
    if (!Array.isArray(values)) throw new TypeError('A lista de canais deve ser um array.');
    return [...new Set(values.map((value) => {
        if (typeof value !== 'string') throw new TypeError('Nome de canal inválido.');
        const name = value.trim().replace(/^#/, '').toLowerCase();
        if (!/^[a-z0-9_]{1,25}$/.test(name)) throw new TypeError('Nome de canal inválido.');
        return `#${name}`;
    }))];
}

function createLocalData(app, fileSystem = fs) {
    const channelPath = () => getChannelsFilePath(app, fileSystem);
    const preferencesPath = () => path.join(app.getPath('userData'), 'Config', 'configs.json');

    function listChannels() {
        const filePath = channelPath();
        return fileSystem.existsSync(filePath) ? normalizeChannels(readChannelsFile(filePath, fileSystem)) : [];
    }

    function saveChannels(channels) {
        const filePath = channelPath();
        fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
        fileSystem.writeFileSync(filePath, JSON.stringify(channels));
        return channels;
    }

    function readPreferences() {
        const filePath = preferencesPath();
        if (!fileSystem.existsSync(filePath)) return { ...DEFAULT_PREFERENCES };
        const stored = JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
        if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
            throw new Error('Arquivo de preferências inválido.');
        }
        return {
            ...DEFAULT_PREFERENCES,
            ...stored,
            appearance: stored.appearance === 'classic' ? 'classic' : 'modern',
        };
    }

    return {
        channels: {
            list: listChannels,
            add(values) {
                const current = listChannels();
                const additions = normalizeChannels(values).filter((value) => !current.includes(value));
                if (additions.length) saveChannels([...current, ...additions]);
                return { channels: [...current, ...additions], added: additions.length };
            },
            remove(values) {
                const current = listChannels();
                const targets = new Set(normalizeChannels(values));
                const remaining = current.filter((value) => !targets.has(value));
                if (remaining.length !== current.length) saveChannels(remaining);
                return { channels: remaining, removed: current.length - remaining.length };
            },
            replace(values) { return saveChannels(normalizeChannels(values)); },
        },
        preferences: {
            get: readPreferences,
            updateNotifications(values) {
                if (!values || typeof values !== 'object' ||
                    typeof values.NotifyMe !== 'boolean' || typeof values.NotifyGift !== 'boolean') {
                    throw new TypeError('Preferências de notificação inválidas.');
                }
                const updated = {
                    ...readPreferences(),
                    NotifyMe: values.NotifyMe,
                    NotifyGift: values.NotifyGift,
                };
                const filePath = preferencesPath();
                fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
                fileSystem.writeFileSync(filePath, JSON.stringify(updated));
                return updated;
            },
            updateAppearance(value) {
                if (!['modern', 'classic'].includes(value)) {
                    throw new TypeError('Visual inválido.');
                }
                const updated = { ...readPreferences(), appearance: value };
                const filePath = preferencesPath();
                fileSystem.mkdirSync(path.dirname(filePath), { recursive: true });
                fileSystem.writeFileSync(filePath, JSON.stringify(updated));
                return updated;
            },
        },
    };
}

module.exports = { createLocalData, normalizeChannels };
