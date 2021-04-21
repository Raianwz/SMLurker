const { app, BrowserWindow } = require('electron');
const shell = require('electron').shell;
const {autoUpdater} = require("electron-updater");
let mainWindow;
var isWin = process.platform === "win32";

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

    mainWindow.focus();
    mainWindow.once('ready-to-show', () => mainWindow.show())
}
  
if(isWin){
    app.setAppUserModelId("SM Lurker");
}

app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
  console.log('Verificando atualizações')
});
app.on('ready', CreateWindow);
// Quit when all windows are closed. 
app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') { app.quit() } 
}) 
    
app.on('activate', () => {  
    if (BrowserWindow.getAllWindows().length === 0) { 
      createWindow() 
    } 
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