const { app, BrowserWindow } = require('electron');
const shell = require('electron').shell;
const {autoUpdater} = require("electron-updater");
const env = require('./src/components/env')
let mainWindow;
var isWin = process.platform === "win32";
require('./src/components/ipc');
MoveFiles(app);
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
      clipMenu(mainWindow);

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

function clipMenu(mainWindow){
    const Menu = require('electron').Menu;

    mainWindow.webContents.on('context-menu', (e, props) => {
      const InputMenu = Menu.buildFromTemplate([{
          label: 'Desfazer',
          role: 'undo',
          accelerator: 'CmdOrCtrl+Z',
      }, {
          label: 'Refazer',
          role: 'redo',
          accelerator: 'CmdOrCtrl+Y',
          
      }, {
          type: 'separator',
      }, {
          label: 'Recortar',
          role: 'cut',
          accelerator: 'CmdOrCtrl+X',
      }, {
          label: 'Copiar',
          role: 'copy',
          accelerator: 'CmdOrCtrl+C',
      }, {
          label: 'Colar',
          role: 'paste',
          accelerator: 'CmdOrCtrl+V',
      }, {
          type: 'separator',
      }, {
          label: 'Selecionar Tudo',
          role: 'selectall',
          accelerator: "CmdOrCtrl+A",
      },
      ]);
      const { inputFieldType, titleText } = props;
      if (inputFieldType === 'plainText' || inputFieldType === 'password' || titleText === 'pings') {
        InputMenu.popup(mainWindow);
      }
    });
}
function MoveFiles(app){
    const fs = require('fs');
    const path = require('path');
    let localPath = `${app.getPath('userData')}\\Config`;
    let credentialsPath = `${app.getPath('userData')}\\credentials.json`;
    let channelFilePath = `${app.getPath('userData')}\\channels.json`
    
    if(!fs.existsSync(localPath)){
        fs.mkdirSync(localPath, { recursive: true })
    }

    if(fs.existsSync(credentialsPath)){
        fs.rename(credentialsPath,`${app.getPath('userData')}\\Config\\credentials.json`,(err)=>{
            if(err) throw err;
            else console.log('Arquivo Movido com Sucesso!');
        });
    }

    if(fs.existsSync(channelFilePath)){
        fs.rename(channelFilePath,`${app.getPath('userData')}\\Config\\channels.json`,(err)=>{
            if(err) throw err;
            else console.log('Arquivo Movido com Sucesso!');
        });
    }   
}