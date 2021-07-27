const { app, BrowserWindow } = require('electron');
const shell = require('electron').shell;
const {autoUpdater} = require("electron-updater");
const env = require('./src/components/env')
let mainWindow;
var isWin = process.platform === "win32";
require('./src/components/ipc');

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
      //clipMenu(mainWindow);

      if (env(app) == 'DEV') {
        mainWindow.webContents.openDevTools();
      }

    mainWindow.focus();
    mainWindow.once('ready-to-show', () => mainWindow.show())
}
  
if(isWin){
    app.setAppUserModelId("SM Lurker");
}

app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('ready', CreateWindow);
// Quit when all windows are closed. 
app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') { app.quit() } 
}) 
    
app.on('activate', () => {  
    if (BrowserWindow.getAllWindows().length === 0) { 
      createWindow();
    }
}) 

app.on('activate',()=>{
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 1000 * 60 * 60);
})
