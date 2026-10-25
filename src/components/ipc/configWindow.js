const { app, ipcMain, BrowserWindow, shell } = require('electron');
const { initialize, enable } = require('@electron/remote/main');
const { createLocalData } = require('../helpers/localData');
const { startupExecutable, getStartupState, setStartupState } = require('../helpers/startupLogin');
const path = require('node:path');
let configWindow;
const localData = createLocalData(app);

ipcMain.handle('appearance:get', (event) => {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Janela não autorizada.');
  return localData.preferences.get().appearance;
});

ipcMain.handle('appearance:set', (event, value) => {
  if (event.sender !== configWindow?.webContents) throw new Error('Janela não autorizada.');
  const appearance = localData.preferences.updateAppearance(value).appearance;
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('appearance:changed', appearance);
  }
  return appearance;
});

ipcMain.handle('startup:get', (event) => {
  if (event.sender !== configWindow?.webContents) throw new Error('Janela não autorizada.');
  return getStartupState(app, startupExecutable({ isPackaged: app.isPackaged }));
});

ipcMain.handle('startup:set', (event, enabled) => {
  if (event.sender !== configWindow?.webContents) throw new Error('Janela não autorizada.');
  return setStartupState(app, startupExecutable({ isPackaged: app.isPackaged }), enabled);
});

ipcMain.on('openConfigs', () => {
  if (!configWindow) {
    configWindow = new BrowserWindow({
      width: 480,
      height: 530,
      title: 'Configurações',
      icon: path.join(__dirname, '../../assets/icon.ico'),
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      show: false,
      fullscreenable: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        preload: path.join(__dirname, '../../preloadConfigs.js'),
      },
    });
    enable(configWindow.webContents);
    configWindow.loadFile('./src/app/configs.html');

    configWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      shell.openExternal(url)
    });
    configWindow.once('ready-to-show', () => { configWindow.show()})

    configWindow.on('close', () => { configWindow = null })
  } else {
    configWindow.focus()
  }
})
