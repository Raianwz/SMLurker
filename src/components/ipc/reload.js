function registerReloadIpc({ app, ipcMain, getMainWindow }) {
    const mainWebContents = (event) => {
        const webContents = getMainWindow()?.webContents;
        return event.sender === webContents ? webContents : null;
    };

    ipcMain.on('app-reload:request', (event) => {
        mainWebContents(event)?.send('app-reload:requested', 'reload');
    });
    ipcMain.on('app-restart:request', (event) => {
        mainWebContents(event)?.send('app-reload:requested', 'restart');
    });
    ipcMain.on('app-reload:perform', (event, action) => {
        const webContents = mainWebContents(event);
        if (!webContents) return;
        if (action === 'restart') {
            app.relaunch();
            app.quit();
        } else if (action === 'reload') {
            webContents.reload();
        }
    });
}

function attachReloadShortcut(window) {
    window.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown' || input.isAutoRepeat ||
            !(input.control || input.meta) || input.alt || input.shift ||
            String(input.key).toLowerCase() !== 'r') return;
        event.preventDefault();
        window.webContents.send('app-reload:requested', 'reload');
    });
}

module.exports = { registerReloadIpc, attachReloadShortcut };
