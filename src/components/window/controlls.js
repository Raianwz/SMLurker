const { title } = require('process');
let skyp = 0;
clipMenu()
function minWindow(){
    const { remote } = require('electron');
    var win = remote.getCurrentWindow();
    win.minimize();
};

function closeWindow(){
    const { remote } = require('electron');
    var win = remote.getCurrentWindow();
    win.close();
};

function hideWindow(){
    const{app, Menu, Tray, Notification, getCurrentWindow} = require('electron').remote
    const {remote: { ipcMain }} = require('electron');
    const path = require('path');
    const env = require('../src/components/env');
    let dist = process.resourcesPath;
    let distFile = 'assets';

    if(env(app) == 'DEV'){dist = __dirname; distFile='../src/assets'}

    let ppL = path.join(dist, `${distFile}/ppL.png`);
    let TppL = path.join(dist, `${distFile}/tray.png`);
    let ezy = path.join(dist,`${distFile}/miniezy.png`);

    path.join(process.resourcesPath, 'data');
    var tray = null;
    var win = getCurrentWindow();

    if( skyp === 0){
        new Notification({
            icon: ppL,
            title: "SM Lurker em segundo plano",
            body: "Para abrir a janela dê um clique sobre o icone. Para mais opções clique com botão direito do mouse sobre o icone",
            timeoutType: 30000,
            urgency: 'critical',
        }).show() 
        
        const template =[{
            label: 'SM Lurker',
            icon: ezy,
            enabled: false,   
         },{type: 'separator'},{
             label: 'Abrir',
             click: ()=> {win.show();},
         },{
             label: 'Configurações',
             click: ()=>{ipcMain.emit('openConfigs');}
         },{type: 'separator'},{
             label: 'Fechar',
             click: () => app.quit(),
         }]
    
         const contextMenu = Menu.buildFromTemplate(template);
         tray = Tray(TppL)
         tray.setToolTip('SM Twitch Lurker')
         tray.setContextMenu(contextMenu)
         tray.on('click', ()=> {
             win.show();
         })
    }
    win.hide();

     return skyp=1;
};

function reloadWindow(){
    const { remote } = require('electron');
    var win = remote.getCurrentWindow();
    win.reload();
}

function clipMenu(){
    const { remote } = require('electron');
    const { Menu, MenuItem } = remote;
    var mainWindow = remote.getCurrentWindow();
    let txtArea = document.getElementById('pTable')

    window.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
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
        if(e.target.type === "text" || e.target.type === "textarea" || e.target.type === "password"){
            InputMenu.popup(mainWindow);
        }

    })

}
