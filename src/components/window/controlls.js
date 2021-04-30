const { title } = require('process');

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

function hideWindow(skip){
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

    if(skip === undefined){
        new Notification({
            icon: ppL,
            title: "SM Lurker em segundo plano",
            body: "Para abrir a janela dê um clique sobre o icone. Para mais opções clique com botão direito do mouse sobre o icone",
            timeoutType: 10000,
            urgency: 'critical',
        }).show()
    }
    win.hide();

    const template =[{
        label: 'SM Lurker',
        icon: ezy,
        enabled: false,   
     },{type: 'separator'},{
         label: 'Abrir',
         click: ()=> {win.show(); tray.destroy()},
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
         tray.destroy();
     })
};

function reloadWindow(){
    const { remote } = require('electron');
    var win = remote.getCurrentWindow();
    win.reload();
}