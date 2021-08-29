let tmpTray;
Controlls()

function Controlls() {
    const { remote: { getCurrentWindow, ipcMain, app: { getVersion } } } = require('electron')
    const wButton = btn => document.querySelector(`svg[name=${btn}]`)

    wButton('closeWindow').addEventListener('click', () => getCurrentWindow().close())
    wButton('minWindow').addEventListener('click', () => getCurrentWindow().minimize())
    if (document.querySelector('h1').textContent != 'Configurações') {
        wButton('hideWindow').addEventListener('click', () => hideWindow())
        wButton('gearConfig').addEventListener('click', () => { ipcMain.emit('openConfigs') })
        document.querySelector('header h1#sm').innerText += ` Beta ${getVersion()}`;
        clipMenu()
    }
}

function hideWindow() {
    const { remote: { app, Menu, Tray, getCurrentWindow, ipcMain, nativeImage: { createFromPath } } } = require('electron')
    const path = require('path'), win = getCurrentWindow(), env = require('../src/components/helpers/env');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    let dist = process.resourcesPath, distFile = 'assets';
    let tray = null;
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../src/assets' }

    const ppL = path.join(dist, `${distFile}/ppL.ico`), ezy = path.join(dist, `${distFile}/miniezy.png`);
    const Resize = (img) => createFromPath(img).resize({ height: '256', width: '256', quality: 'best' })
    path.join(process.resourcesPath, 'data');

    if (!configs.NotifyTray) {
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
        win.hide();
        configs.NotifyTray = true
        fs.writeFileSync(configPath, JSON.stringify(configs));
        return tmpTray = tray
    }
    win.hide();
};

function clipMenu() {
    const { remote: { app, Menu, getCurrentWindow } } = require('electron');
    const mainWindow = getCurrentWindow();
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
    const ShortMenu = Menu.buildFromTemplate([{
        label: 'Recarregar',
        role: 'reload',
        accelerator: 'CmdOrCtrl+R'
    }, {
        type: 'separator'
    }, {
        label: 'Reiniciar',
        click: () => { app.relaunch(); app.quit() },
    }])

    document.querySelector('svg[name="menuConfig"]').addEventListener('click', () => {
        ShortMenu.popup(mainWindow);
    })
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        let ele = e.target
        if (ele.type === "text" || ele.type === "textarea" || ele.type === "password") {
            InputMenu.popup(mainWindow);
        }
    })

}

window.addEventListener('beforeunload', () => {
    const { remote: { app } } = require('electron')
    const fs = require('fs');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    configs.NotifyTray = false
    fs.writeFileSync(configPath, JSON.stringify(configs));
    tmpTray != null ? tmpTray.destroy() : true
})
