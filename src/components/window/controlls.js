let tmpTray;
Controlls()
clipMenu()
SkipHideNotify()

function Controlls() {
    const { remote: { getCurrentWindow, ipcMain } } = require('electron')
    const wButton = btn => document.querySelector(`svg[name=${btn}]`)

    wButton('closeWindow').addEventListener('click', () => getCurrentWindow().close())
    wButton('minWindow').addEventListener('click', () => getCurrentWindow().minimize())
    if (document.querySelector('h1').textContent != 'Configurações') {
        wButton('hideWindow').addEventListener('click', () => hideWindow())
        wButton('gearConfig').addEventListener('click', () => { ipcMain.emit('openConfigs') })
    }
}


function SkipHideNotify() {
    let value = false;
    if (localStorage.hasOwnProperty('SkipHideNotify')) {
        !JSON.parse(localStorage.getItem('SkipHideNotify')) == false ? value : false
    }
    localStorage.setItem('SkipHideNotify', `${value}`)
}

function hideWindow() {
    const { remote: { app, Menu, Tray, getCurrentWindow, ipcMain, nativeImage: { createFromPath } } } = require('electron')
    const path = require('path'), win = getCurrentWindow(), env = require('../src/components/env');
    let dist = process.resourcesPath, distFile = 'assets';
    let tray = null;
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../src/assets' }

    const ppL = path.join(dist, `${distFile}/pepeL.ico`), ezy = path.join(dist, `${distFile}/miniezy.png`);
    const Resize = (img) => createFromPath(img).resize({ height: '256', width: '256', quality: 'best' })
    path.join(process.resourcesPath, 'data');

    if (!JSON.parse(localStorage.getItem('SkipHideNotify'))) {
        localStorage.setItem('SkipHideNotify', true)
        const template = [{
            label: 'SM Lurker',
            icon: ezy,
            enabled: false,
        }, { type: 'separator' }, {
            label: 'Abrir',
            click: () => { win.show(); },
        }, {
            label: 'Configurações',
            click: () => { ipcMain.emit('openConfigs'); }
        }, { type: 'separator' }, {
            label: 'Fechar',
            click: () => app.quit(),
        }]
        const contextMenu = Menu.buildFromTemplate(template);
        tray = new Tray(ppL)
        tray.setToolTip('SM Twitch Lurker')
        tray.setContextMenu(contextMenu)
        tray.on('click', () => {
            win.show();
        })
        tray.displayBalloon({
            title: 'SM Lurker em segundo plano',
            content: 'Para abrir a janela dê um clique sobre o icone. Para mais opções clique com botão direito do mouse sobre o icone',
            icon: Resize(ppL),
        })
        tmpTray = tray
    }
    win.hide();
};

function clipMenu() {
    const { remote: { Menu, getCurrentWindow, app:{ getVersion} } } = require('electron');
    const mainWindow = getCurrentWindow();
    //document.querySelector('header h1#sm').innerText += ` Beta ${getVersion()}`;

    window.addEventListener('contextmenu', (e) => {
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
        if (e.target.type === "text" || e.target.type === "textarea" || e.target.type === "password") {
            InputMenu.popup(mainWindow);
        }

    })

}

window.addEventListener('beforeunload', () => {
    tmpTray != null ? tmpTray.destroy() : true
})
