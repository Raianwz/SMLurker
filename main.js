const { initialize, enable } = require('@electron/remote/main'); initialize();
const { app, BrowserWindow, shell, Notification, ipcMain, safeStorage, dialog } = require('electron');
const { autoUpdater } = require("electron-updater");
const isWin = process.platform === "win32";
const env = (app) => app.isPackaged ? 'PRODUCTION' : 'DEV'
const { SetUpTray } = require('./src/components/helpers/tray');
const { startUpdateChecks } = require('./src/components/helpers/updateChecks');
const { initConfigs } = require('./src/components/helpers/setupConfigs');
const path = require('path');
const gotTheLock = app.requestSingleInstanceLock();
const { PROTOCOL, callbackFromArgs } = require('./src/components/twitch/webLogin');
const { createWebLoginController } = require('./src/components/ipc/webLogin');
const { registerLocalDataIpc } = require('./src/components/ipc/localData');
const { registerChannelFilesIpc } = require('./src/components/ipc/channelFiles');
const { registerLegacyCredentialsIpc } = require('./src/components/ipc/legacyCredentials');
const { registerReloadIpc, attachReloadShortcut } = require('./src/components/ipc/reload');

require('./src/components/ipc/configWindow');
require('./src/components/ipc/eventPanel');
let mainWindow;
let updateChecks;
const initialWebLoginUrl = callbackFromArgs(process.argv);
function fromMainWindow(event) {
    if (event.sender !== mainWindow?.webContents) throw new Error('Janela não autorizada.');
}
registerLocalDataIpc({ app, ipcMain, fromMainWindow });
registerChannelFilesIpc({ app, ipcMain, dialog, getMainWindow: () => mainWindow, fromMainWindow });
registerLegacyCredentialsIpc({ app, ipcMain, safeStorage, fromMainWindow });
registerReloadIpc({ app, ipcMain, getMainWindow: () => mainWindow });
const webLogin = createWebLoginController({
    app, ipcMain, shell, Notification, safeStorage,
    getMainWindow: () => mainWindow,
    fromMainWindow,
});
checkFiles();

if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
    app.setAsDefaultProtocolClient(PROTOCOL);
}

function CreateWindow() {
    mainWindow = new BrowserWindow({
        title: 'SM Lurker',
        icon: './src/assets/icon.ico',
        width: 480,
        height: 500,
        resizable: false,
        maxHeight: 500,
        maxWidth: 480,
        minHeight: 500,
        minWidth: 480,
        autoHideMenuBar: true,
        frame: false,
        transparent: true,
        fullscreen: false,
        show: false,
        maximizable: false,
        webPreferences: {
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
            preload: path.join(__dirname, "./src/preload.js"),
        }
    })
    enable(mainWindow.webContents);
    attachReloadShortcut(mainWindow);
    mainWindow.loadFile('./src/app/index.html');
    mainWindow.webContents.on('did-finish-load', webLogin.flushResult);

    //Open Links in Browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault()
        shell.openExternal(url)
    });

    if (env(app) == 'DEV') mainWindow.webContents.openDevTools();
    mainWindow.focus();

    mainWindow.once('ready-to-show', () => {
        if (webLogin.shouldForceShowLogin()) {
            mainWindow.show();
            mainWindow.focus();
        } else iniMin(mainWindow)
    })


    mainWindow.on('close', () => {
        ipcMain.emit('closeConsole')
    })
}

isWin ? app.setAppUserModelId('com.smlurker') : false

if (!gotTheLock) { app.quit() }
else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
        const callbackUrl = callbackFromArgs(commandLine);
        if (callbackUrl) void webLogin.handleCallback(callbackUrl);
    })
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    if (!gotTheLock) return;
    if (callbackFromArgs([url])) void webLogin.handleCallback(url);
});

app.on('ready', () => {
    if (!gotTheLock) return;
    initConfigs();
    CreateWindow();
    if (initialWebLoginUrl) void webLogin.handleCallback(initialWebLoginUrl);
    SetUpTray(app, mainWindow);
    updateChecks = startUpdateChecks({
        updater: autoUpdater,
        isPackaged: app.isPackaged,
        onDownloaded: updateNotify,
    });
});


// Quit when all windows are closed. 
app.on('window-all-closed', () => {
    ipcMain.emit('closeConsole')
    if (updateChecks?.isUpdateReady()) {
        autoUpdater.quitAndInstall(true, true)
        return
    }
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        CreateWindow();
    }
})

function updateNotify(info) {
    if (!Notification.isSupported()) return;
    try {
        const version = info?.releaseName || info?.version || 'mais recente';
        const ntf = new Notification({
            title: 'Atualização pronta!',
            body: `Para instalar a versão ${version} basta fechar o SMLurker.\nClique aqui para conferir o que mudou nessa versão.`
        });
        ntf.on('click', () => shell.openExternal('https://github.com/Raianwz/SMLurker/releases/latest'));
        ntf.show();
    } catch (error) {
        console.warn('Não foi possível mostrar a notificação de atualização:', error);
    }
}
function checkFiles() {
    const fs = require('fs');
    let localPath = `${app.getPath('userData')}\\Config`;
    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true })
    }
}
function iniMin(mainWindow) {
    const fs = require('fs');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        configs.inimin ? mainWindow.hide() : mainWindow.show();;
    } 
   
}
