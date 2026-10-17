const { app, ipcMain, BrowserWindow, shell } = require('electron');
const { initialize, enable } = require('@electron/remote/main');
const { createLocalData } = require('../helpers/localData');
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

ipcMain.on('openConfigs', () => {
  if (!configWindow) {
    configWindow = new BrowserWindow({
      width: 480,
      height: 530,
      title: 'Configurações',
      icon: './src/assets/icon.ico',
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      show: false,
      fullscreenable: false,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: true,
        enableRemoteModule: true
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
