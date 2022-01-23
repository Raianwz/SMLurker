const path = require('path'), fs = require('fs')
const { Menu, Tray, ipcMain, nativeImage: { createFromPath }, app } = require('electron');
let tray = null, ppL = null, ezy = null;

module.exports.SetUpTray = setUpTray;
module.exports.ExportTray = exportTray;

function setUpTray(app, win, env) {
    let dist = process.resourcesPath, distFile = 'assets';
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../../../src/assets' }
    ppL = path.join(dist, `${distFile}/ppL.ico`), ezy = path.join(dist, `${distFile}/miniezy.png`);
    const WinClosed = () =>{ try { win.show() } catch (err) { app.quit()} }

    const template = [{ label: 'SM Lurker', icon: ezy, enabled: false, }, { type: 'separator' },
    { label: 'Abrir', click: () => WinClosed()  }, { label: 'Configurações', click: () => { ipcMain.emit('openConfigs'); } },
    { type: 'separator' }, { label: 'Fechar/Sair', click: () => app.quit(), }]
    
    const contextMenu = Menu.buildFromTemplate(template);
    tray = new Tray(ppL)
    tray.setIgnoreDoubleClickEvents(true);
    tray.setToolTip('SM Twitch Lurker')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => { WinClosed() })
};

function exportTray(env) {
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    const Resize = (img) => createFromPath(img).resize({ height: '256', width: '256', quality: 'best' });
    let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../../../src/assets' }
    ppL = path.join(dist, `${distFile}/ppL.ico`)
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