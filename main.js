const { initialize, enable } = require('@electron/remote/main'); initialize();
const { app, BrowserWindow, shell, Notification } = require('electron');
const { autoUpdater } = require("electron-updater");
const isWin = process.platform === "win32";
const env = (app) => app.isPackaged ? 'PRODUCTION' : 'DEV'
const { SetUpTray } = require('./src/components/helpers/tray');
const { initConfigs } = require('./src/components/helpers/setupConfigs');
const path = require('path');
const gotTheLock = app.requestSingleInstanceLock();
require('./src/components/ipc');
let mainWindow, auxcheck;
checkFiles();

function CreateWindow() {
    mainWindow = new BrowserWindow({
        title: 'SM Lurker',
        icon: './src/assets/icon.ico',
        width: 480,
        height: 500,
        resizable: true,
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
            preload: path.join(__dirname, "./preload.js"),
        }
    })
    enable(mainWindow.webContents);
    mainWindow.loadFile('./app/index.html');

    //Open Links in Browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault()
        shell.openExternal(url)
    });

    if (env(app) == 'DEV') mainWindow.webContents.openDevTools();
    mainWindow.focus();
    mainWindow.once('ready-to-show', () => mainWindow.show())
    iniMin(mainWindow)
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
    })
}

app.on('ready', () => {
    initConfigs();
    CreateWindow();
    SetUpTray(app, mainWindow, env);
    autoUpdater.checkForUpdates().then(rsp => { return auxcheck = rsp.updateInfo })
    autoUpdater.addListener('update-downloaded', () => updateNotify())
});


// Quit when all windows are closed. 
app.on('window-all-closed', () => {
    autoUpdater.quitAndInstall(true, true)
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        CreateWindow();
    }
})

function updateNotify() {
    let ntf = new Notification({
        title: 'Atualização Baixada!',
        body: `Para instalar a versão ${auxcheck.releaseName} basta fechar o SMLurker.\nClique aqui para conferir o que mudou nessa versão.`
    })
    ntf.show()
    ntf.on('click', () => shell.openExternal('https://github.com/Raianwz/SMLurker/releases/latest'))
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
        configs.inimin ? mainWindow.hide() : false;
    }
}

setInterval(() => {
    console.log("\nProcurandinhu por atualizacoes... \n")
    if (env(app) == "DEV") console.log("Nada acontece feijoada :)")
    else {
        autoUpdater.checkForUpdates().then(rsp => { return auxcheck = rsp.updateInfo })
        autoUpdater.addListener('update-downloaded', () => updateNotify())
    };
}, 1000 * 60 * 60);
