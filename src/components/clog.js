const { ipcMain, BrowserWindow, shell } = require('electron');
const { initialize, enable } = require('@electron/remote/main');
const path = require('path');
let consoleWindow;

function createConsoleWindow() {
  if (!consoleWindow) {
    consoleWindow = new BrowserWindow({
      width: 800,
      height: 400,
      minHeight: 400,
      minWidth: 600,
      title: 'Painel de Eventos',
      icon: './src/assets/icon.ico',
      frame: true,
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
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#202225',
        symbolColor: '#9148ff'
      },
    });
    enable(consoleWindow.webContents);
    consoleWindow.loadFile('./src/app/console.html');

    consoleWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      shell.openExternal(url)
    });

    consoleWindow.webContents.on('did-finish-load', () => {
      consoleWindow.webContents.executeJavaScript(`api.console.panelListiner()`)
    });

    consoleWindow.on('closed', () => { consoleWindow = null; });

    consoleWindow.on('close', (event) => {
      event.preventDefault();
      consoleWindow.hide();
    });
  }
  
}


ipcMain.on('openConsole', (event, data) => {
  if (consoleWindow !== null) {
    consoleWindow.show()
  }
})

ipcMain.on('closeConsole', () => {
  if (consoleWindow !== null) {
    consoleWindow.destroy()
  }
})

ipcMain.on('sendtoConsole', (event, data) => {
  if(consoleWindow !== null){
    consoleWindow.webContents.send('updateConsole', data);
  }

 })
 
ipcMain.on('sendtoCleanConsole', (event, data) => {
  if(consoleWindow !== null){
    consoleWindow.webContents.send('updateCleanConsole', data);
  }
 })

 ipcMain.on('sendMentionstoConsole', (event, data) => {
  if(consoleWindow !== null){
    consoleWindow.webContents.send('updateMentionsConsole', data);
  }
 })

 ipcMain.on('sendChannelstoConsole', (event, channels) => {
  if(consoleWindow !== null){
    consoleWindow.webContents.send('updateChannelsConsole', channels);
  }
 })

 module.exports.createConsoleW = createConsoleWindow;