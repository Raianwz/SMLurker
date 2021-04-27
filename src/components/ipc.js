const { ipcMain, BrowserWindow} = require('electron');
const shell = require('electron').shell;
const environment = require('./env');
let configWindow;

ipcMain.on('openConfigs', () =>{

    if(!configWindow){
        configWindow = new BrowserWindow({
            width: 400,
            height: 250,
            title:'Configurações',
            icon: './src/assets/icon.ico',
            frame: false,
            transparent: true,
            resizable: false,
            maximizable: false,
            show: false,
            fullscreenable: false,
            webPreferences: {
              nodeIntegration: true,
              enableRemoteModule: true,
            },
          });
        configWindow.loadFile('./app/configs.html');

        configWindow.webContents.on('will-navigate', (event, url) => {
          event.preventDefault()
          shell.openExternal(url)
        });
        configWindow.once('ready-to-show', () =>{ configWindow.show();})

        configWindow.on('close', () => {configWindow = null})
    }else{
        configWindow.focus()
    }
})
