const { app, BrowserWindow } = require('electron');
const shell = require('electron').shell;
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
        fullscreen: false,
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
    mainWindow.webContents.on("context-menu", ({ sender: webContents }, { editFlags }) => {
        const template = [
          ...(editFlags.canRedo
            ? [
              { label: "Refazer", click: () => webContents.redo(), accelerator: "CmdOrCtrl+Y" },
            ]
            : []
          ),
          ...(editFlags.canUndo
            ? [
              { label: "Desfazer", click: () => webContents.undo(), accelerator: "CmdOrCtrl+Z" },
              { type: "separator" },
            ]
            : []
          ),
          ...(editFlags.canCut
            ? [
              {
                label: "Recortar", click: () => webContents.cut(),
                accelerator: "CmdOrCtrl+X"
              },
            ]
            : []
          ),
          ...(editFlags.canCopy
            ? [
              { label: "Copiar", click: () => webContents.copy(), accelerator: "CmdOrCtrl+C" },
            ]
            : []
          ),
          ...(editFlags.canPaste
            ? [
              { label: "Colar", click: () => webContents.paste(), accelerator: "CmdOrCtrl+V" },
            ]
            : []
          ),
          ...(editFlags.canSelectAll
            ? [
              { type: "separator" },
              { label: "Selecionar Tudo", click: () => webContents.selectAll(), accelerator: "CmdOrCtrl+A" },
            ]
            : []
          )
        ];
    
        if (!template.length) {
          return;
        }
    
        Menu
          .buildFromTemplate(template)
          .popup({});
      });
}