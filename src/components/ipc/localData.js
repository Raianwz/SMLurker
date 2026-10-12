const { createLocalData } = require('../helpers/localData');

function registerLocalDataIpc({ app, ipcMain, fromMainWindow }) {
    const localData = createLocalData(app);
    const handle = (channel, action) => ipcMain.handle(channel, (event, ...args) => {
        fromMainWindow(event);
        return action(...args);
    });

    handle('local:channels:list', () => localData.channels.list());
    handle('local:channels:add', (channels) => localData.channels.add(channels));
    handle('local:channels:remove', (channels) => localData.channels.remove(channels));
    handle('local:channels:replace', (channels) => localData.channels.replace(channels));
    handle('local:preferences:get', () => localData.preferences.get());
    handle('local:preferences:update-notifications', (values) => localData.preferences.updateNotifications(values));
}

module.exports = { registerLocalDataIpc };
