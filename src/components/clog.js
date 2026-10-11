const { ipcMain, BrowserWindow, shell } = require('electron');
const { initialize, enable } = require('@electron/remote/main');
const path = require('path');
let consoleWindow;
let consoleReady = false;
let channelCount = 0;
const history = [];
let historyLength = 0;
const MAX_HISTORY_LENGTH = 5500;

function rememberEvent(type, data) {
  const entry = { type, data: String(data) };
  history.push(entry);
  historyLength += entry.data.length;
  while (historyLength > MAX_HISTORY_LENGTH && history.length > 1) {
    historyLength -= history.shift().data.length;
  }
}

function sendToPanel(type, data) {
  if (consoleWindow && consoleReady && !consoleWindow.isDestroyed()) {
    consoleWindow.webContents.send(type, data);
  }
}

function createConsoleWindow() {
  if (!consoleWindow || consoleWindow.isDestroyed()) {
    consoleWindow = new BrowserWindow({
      width: 800,
      height: 400,
      minHeight: 400,
      minWidth: 600,
      title: 'Painel de Eventos',
      icon: './src/assets/icon.ico',
      frame: false,
      transparent: false,
      resizable: true,
      maximizable: true,
      autoHideMenuBar: true,
      show: false,
      fullscreenable: true,
      webPreferences: {
        nodeIntegration: true,
        webSecurity: true,
        enableRemoteModule: true,
        preload: path.join(__dirname, "../preload.js"),
      },
    });
    enable(consoleWindow.webContents);
    consoleWindow.loadFile('./src/app/console.html');

    consoleWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      shell.openExternal(url)
    });

    const panel = consoleWindow;
    panel.webContents.on('did-finish-load', async () => {
      consoleReady = false;
      try {
        await panel.webContents.executeJavaScript(`api.console.panelListiner()`);
        if (panel !== consoleWindow || panel.isDestroyed()) return;
        panel.webContents.send('updateChannelsConsole', channelCount);
        for (const entry of history) panel.webContents.send(entry.type, entry.data);
        consoleReady = true;
        panel.show();
      } catch (error) {
        console.warn('Não foi possível carregar o Painel de Eventos:', error);
      }
    });

    consoleWindow.on('closed', () => { consoleWindow = null; consoleReady = false; });

    consoleWindow.on('close', (event) => {
      event.preventDefault();
      consoleWindow.hide();
    });
  }
  
}


ipcMain.on('openConsole', (event, data) => {
  if (!consoleWindow || consoleWindow.isDestroyed()) createConsoleWindow();
  else if (consoleReady) consoleWindow.show();
})

ipcMain.on('closeConsole', () => {
  if (consoleWindow && !consoleWindow.isDestroyed()) consoleWindow.destroy();
})

ipcMain.on('sendtoConsole', (event, data) => {
  rememberEvent('updateConsole', data);
  sendToPanel('updateConsole', data);
 })
 
ipcMain.on('sendtoCleanConsole', (event, data) => {
  history.length = 0;
  historyLength = 0;
  sendToPanel('updateCleanConsole');
 })

 ipcMain.on('sendMentionstoConsole', (event, data) => {
  rememberEvent('updateMentionsConsole', data);
  sendToPanel('updateMentionsConsole', data);
 })

 ipcMain.on('sendChannelstoConsole', (event, channels) => {
  channelCount = channels;
  sendToPanel('updateChannelsConsole', channels);
 })

 module.exports.createConsoleW = createConsoleWindow;
