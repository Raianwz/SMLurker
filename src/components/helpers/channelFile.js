const fs = require('node:fs');
const path = require('node:path');

function getChannelsFilePath(app, fileSystem = fs) {
    if (app.isPackaged) return path.join(app.getPath('userData'), 'Config', 'channels.json');

    const devDirectory = path.join(app.getAppPath(), 'devdata');
    fileSystem.mkdirSync(devDirectory, { recursive: true });
    return path.join(devDirectory, 'channels.json');
}

function parseChannels(contents) {
    try {
        const channels = JSON.parse(contents);
        if (!Array.isArray(channels)) throw new Error('A lista de canais deve ser um array.');
        return channels;
    } catch (error) {
        if (/^\s*[\[{\"]/.test(contents)) throw error;
        const channels = contents.split(/[,;\s]+/).filter(Boolean);
        if (!channels.every((channel) => /^#?[a-z0-9_]+$/i.test(channel))) throw error;
        return channels.map((channel) => channel.startsWith('#') ? channel : `#${channel}`);
    }
}

function readChannelsFile(filePath, fileSystem = fs) {
    return parseChannels(fileSystem.readFileSync(filePath, 'utf8'));
}

module.exports = { getChannelsFilePath, parseChannels, readChannelsFile };
