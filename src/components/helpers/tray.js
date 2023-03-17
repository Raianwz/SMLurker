const path = require('path'), fs = require('fs')
const { Menu, Tray, ipcMain, nativeImage: { createFromPath }, app } = require('electron');
let tray = null, ppL = null, ezy = null;

module.exports.SetUpTray = setUpTray;
module.exports.ExportTray = exportTray;

function setUpTray(app, win, env) {
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let dist = process.resourcesPath, distFile = 'assets';
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../../../src/assets' }
    ppL = path.join(dist, `${distFile}/ppL.ico`), ezy = path.join(dist, `${distFile}/miniezy.png`);
    const WinClosed = () => { try { if (win.isVisible()) { win.hide() } else { win.show() } } catch (err) { app.quit() } }

    const template = [{ label: 'SM Lurker', icon: ezy, enabled: false, }, { type: 'separator' },
    { label: 'Mostrar/Ocultar', click: () => { WinClosed() } },
    { label: 'Configurações', click: () => { ipcMain.emit('openConfigs'); } },
    { label: 'Reiniciar', click: () => { app.relaunch(); app.quit() } },
    { type: 'separator' }, { label: 'Fechar e Sair', click: () => app.quit(), }]

    const contextMenu = Menu.buildFromTemplate(template);
    tray = new Tray(ppL)
    tray.setIgnoreDoubleClickEvents(true);
    tray.setToolTip('SM Twitch Lurker')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => { WinClosed() })

    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        configs.NotifyTray = false;
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
};

function exportTray() {
    const { app, Notification } = require('@electron/remote');
    const { API } = require('../../../preload');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    const Resize = (img) => createFromPath(img).resize({ height: '256', width: '256', quality: 'best' });
    let dist = process.resourcesPath, distFile = 'assets';
    if (API.helpers.env() == 'DEV') { dist = __dirname; distFile = '../../../src/assets' }
    ppL = path.join(dist, `${distFile}/ppL.ico`)
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        if (!configs.NotifyTray) {
            new Notification({
                icon: Resize(ppL), title: `SM Lurker em segundo plano`,
                body: `Para abrir a janela clique sobre o icone. Para mais opções clique com botão direito do mouse sobre o icone`,
                timeoutType: 'default', urgency: 'low'
            }).show()
            configs.NotifyTray = true
            fs.writeFileSync(configPath, JSON.stringify(configs));
        }
    }
}