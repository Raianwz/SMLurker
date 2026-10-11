const { initialize, enable } = require('@electron/remote/main'); initialize();
const { app, BrowserWindow, shell, Notification, ipcMain, safeStorage } = require('electron');
const { autoUpdater } = require("electron-updater");
const isWin = process.platform === "win32";
const env = (app) => app.isPackaged ? 'PRODUCTION' : 'DEV'
const { SetUpTray } = require('./src/components/helpers/tray');
const { startUpdateChecks } = require('./src/components/helpers/updateChecks');
const { initConfigs } = require('./src/components/helpers/setupConfigs');
const path = require('path');
const gotTheLock = app.requestSingleInstanceLock();
const { createConsoleW } = require('./src/components/clog')
const { PROTOCOL, callbackFromArgs, createWebLogin } = require('./src/components/twitch/webLogin');
const { createWebSession } = require('./src/components/twitch/webSession');

require('./src/components/ipc');
require('./src/components/clog')
let mainWindow;
let updateChecks;
let queuedWebLoginResult = null;
let forceShowLogin = false;
const initialWebLoginUrl = callbackFromArgs(process.argv);
const webSession = createWebSession({ directory: path.join(app.getPath('userData'), 'Config'), safeStorage });
const webLogin = createWebLogin({
    isPackaged: app.isPackaged,
    openExternal: (url) => shell.openExternal(url),
    onResult: (result) => {
        if (result.type === 'success') {
            forceShowLogin = false;
            let remembered = false;
            try {
                remembered = webSession.save(result);
                if (!remembered) webSession.clear();
            } catch {
                try { webSession.clear(); } catch { /* A sessão atual ainda pode ser usada em memória. */ }
            }
            result = { ...result, remembered };
        }
        queuedWebLoginResult = result;
        flushWebLoginResult();
    },
});
checkFiles();

function flushWebLoginResult() {
    if (!queuedWebLoginResult || !mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) return;
    mainWindow.webContents.send('web-login:result', queuedWebLoginResult);
    queuedWebLoginResult = null;
}

function requestWebLoginAgain() {
    forceShowLogin = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    if (Notification.isSupported()) {
        try {
            const notification = new Notification({
                title: 'Login da Twitch necessário',
                body: 'A sessão expirou ou foi recusada. Abra o SMLurker para entrar novamente.',
            });
            notification.on('click', () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                }
            });
            notification.show();
        } catch { /* A janela e a mensagem de login continuam disponíveis. */ }
    }
}

if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
    app.setAsDefaultProtocolClient(PROTOCOL);
}

ipcMain.handle('web-login:start', async () => {
    try {
        await webLogin.start();
        return { ok: true };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível iniciar o login pelo navegador.' };
    }
});

ipcMain.handle('web-login:restore', async () => {
    const result = await webSession.restore();
    if (result.requiresLogin) requestWebLoginAgain();
    return result;
});

ipcMain.handle('web-login:invalid', () => {
    try { webSession.clear(); } catch { /* A interface ainda solicitará um novo login. */ }
    requestWebLoginAgain();
    return { ok: true };
});

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
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: true,
            preload: path.join(__dirname, "./src/preload.js"),
        }
    })
    enable(mainWindow.webContents);
    mainWindow.loadFile('./src/app/index.html');
    mainWindow.webContents.on('did-finish-load', flushWebLoginResult);

    //Open Links in Browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault()
        shell.openExternal(url)
    });

    if (env(app) == 'DEV') mainWindow.webContents.openDevTools();
    mainWindow.focus();

    mainWindow.once('ready-to-show', () => {
        if (forceShowLogin) {
            mainWindow.show();
            mainWindow.focus();
        } else iniMin(mainWindow)
        createConsoleW()
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
    if (callbackFromArgs([url])) void webLogin.handleCallback(url);
});

app.on('ready', () => {
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

