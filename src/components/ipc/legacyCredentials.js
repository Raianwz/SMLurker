const path = require('node:path');
const { createLegacyCredentials } = require('../twitch/legacyCredentials');

function registerLegacyCredentialsIpc({ app, ipcMain, safeStorage, fromMainWindow }) {
    const credentials = createLegacyCredentials({
        directory: path.join(app.getPath('userData'), 'Config'), safeStorage,
    });
    ipcMain.handle('legacy-credentials:load', (event) => {
        fromMainWindow(event);
        return credentials.load();
    });
    ipcMain.handle('legacy-credentials:save', (event, values) => {
        fromMainWindow(event);
        return credentials.save(values);
    });
}

module.exports = { registerLegacyCredentialsIpc };
