const { ipcMain, BrowserWindow, shell } = require('electron');
const { initialize, enable } = require('@electron/remote/main');
const path = require('path');
const { MAX_EVENT_CHARS } = require('../helpers/eventHistoryLimit');
let consoleWindow;
let consoleReady = false;
let channelCount = 0;
const history = [];
let historyLength = 0;
let emptyReason = null;

function rememberEvent(type, data, category) {
  const entry = { type, data: String(data), category };
  if (historyLength + entry.data.length >= MAX_EVENT_CHARS) {
    history.length = 0;
    historyLength = 0;
    emptyReason = 'limit';
    sendToPanel('updateCleanConsole', 'limit');
    return false;
  }
  history.push(entry);
  historyLength += entry.data.length;
  return true;
}

function sendToPanel(type, data, category) {
  if (consoleWindow && consoleReady && !consoleWindow.isDestroyed()) {
    if (category) consoleWindow.webContents.send(type, data, category);
    else consoleWindow.webContents.send(type, data);
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
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        preload: path.join(__dirname, "../../preload.js"),
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
        if (emptyReason) panel.webContents.send('updateCleanConsole', emptyReason);
        for (const entry of history) {
          if (entry.category) panel.webContents.send(entry.type, entry.data, entry.category);
          else panel.webContents.send(entry.type, entry.data);
        }
        consoleReady = true;
        panel.show();
      } catch (error) {
        console.warn('Não foi possível carregar o Painel de Eventos:', error);
      }
    });

    consoleWindow.on('closed', () => { consoleWindow = null; consoleReady = false; });
  }
  
}


ipcMain.on('openConsole', (event, data) => {
  if (!consoleWindow || consoleWindow.isDestroyed()) createConsoleWindow();
  else if (consoleReady) consoleWindow.show();
})

ipcMain.on('closeConsole', () => {
  if (consoleWindow && !consoleWindow.isDestroyed()) consoleWindow.destroy();
})

ipcMain.on('sendtoConsole', (event, data, category) => {
  const eventCategory = category === 'connections' ? 'connections' : undefined;
  if (rememberEvent('updateConsole', data, eventCategory)) sendToPanel('updateConsole', data, eventCategory);
 })
 
ipcMain.on('sendtoCleanConsole', (event, data) => {
  history.length = 0;
  historyLength = 0;
  emptyReason = null;
  sendToPanel('updateCleanConsole');
 })

 ipcMain.on('sendMentionstoConsole', (event, data) => {
  if (rememberEvent('updateMentionsConsole', data)) sendToPanel('updateMentionsConsole', data);
 })

 ipcMain.on('sendSubGiftstoConsole', (event, data) => {
  if (rememberEvent('updateSubGiftsConsole', data)) sendToPanel('updateSubGiftsConsole', data);
 })

 ipcMain.on('sendChannelstoConsole', (event, channels) => {
  channelCount = channels;
  sendToPanel('updateChannelsConsole', channels);
 })

 module.exports.createConsoleW = createConsoleWindow;
