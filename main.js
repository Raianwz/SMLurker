const { app, BrowserWindow, shell } = require('electron');
const { autoUpdater } = require("electron-updater");
const isWin = process.platform === "win32";
const env = require('./src/components/helpers/env');
const initConfigs = require('./src/components/helpers/initConfigs');
require('./src/components/ipc');
let mainWindow;
checkFiles();

function CreateWindow() {
    mainWindow = new BrowserWindow({
        title: 'SM Lurker',
        icon: './src/assets/icon.ico',
        width: 800,
        height: 400,
        resizable: false,
        frame: false,
        transparent: true,
        fullscreen: false,
        show: false,
        maximizable: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: true,
            enableRemoteModule: true,
        }
    })
    mainWindow.loadFile('./app/index.html')

    //Open Links in Browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault()
        shell.openExternal(url)
    });

    if (env(app) == 'DEV') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.focus();
    mainWindow.once('ready-to-show', () => mainWindow.show())
}

isWin ? app.setAppUserModelId('com.smlurker') : false

app.on('ready', () => {
    autoUpdater.checkForUpdatesAndNotify();
    initConfigs();
    CreateWindow();
});

// Quit when all windows are closed. 
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit() }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        CreateWindow();
    }
})

function checkFiles() {
    const fs = require('fs'), path = require('path');
    let localPath = `${app.getPath('userData')}\\Config`;
    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true })
    }
}