const fs = require('fs');
const { Menu, Tray, dialog, ipcMain, nativeImage: { createFromPath } } = require('electron');
const { assetPath } = require('./assets');

let tray = null;
let iconPath = null;
let headerIconPath = null;
let connectionStatus = 'disconnected';
let channelCount = 0;

module.exports.SetUpTray = setUpTray;
module.exports.ExportTray = exportTray;

function setUpTray(app, win) {
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    iconPath = assetPath(app, 'ppL.ico');
    headerIconPath = assetPath(app, 'miniezy.png');

    const isOpen = () => !win.isDestroyed() && win.isVisible() && !win.isMinimized();
    const toggleWindow = () => {
        if (win.isDestroyed()) return;
        if (isOpen()) {
            win.hide();
        } else {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    };
    const statusText = () => {
        if (connectionStatus === 'connecting') return 'Conectando...';
        if (connectionStatus === 'reconnecting') return 'Reconectando...';
        if (connectionStatus === 'connected') return `Conectado · ${channelCount} ${channelCount === 1 ? 'canal' : 'canais'}`;
        return 'Desconectado';
    };
    const refreshTray = () => {
        if (!tray) return;
        const status = statusText();
        tray.setToolTip(`SM Twitch Lurker — ${status}`);
        tray.setContextMenu(Menu.buildFromTemplate([
            { label: 'SM Lurker', icon: headerIconPath, enabled: false },
            { label: status, enabled: false },
            { type: 'separator' },
            { label: isOpen() ? 'Ocultar na bandeja' : 'Abrir SMLurker', click: toggleWindow },
            { label: 'Configurações', click: () => ipcMain.emit('openConfigs') },
            { label: 'Painel de Eventos', click: () => ipcMain.emit('openConsole') },
            { type: 'separator' },
            { label: 'Reiniciar', click: () => {
                const answer = dialog.showMessageBoxSync({
                    type: 'question',
                    title: 'Reiniciar SMLurker',
                    message: 'Deseja reiniciar agora?',
                    buttons: ['Não', 'Sim'],
                    defaultId: 0,
                    cancelId: 0,
                    noLink: true,
                });
                if (answer === 1) {
                    app.relaunch();
                    app.quit();
                }
            } },
            { type: 'separator' },
            { label: 'Fechar e Sair', click: () => { ipcMain.emit('closeConsole'); app.quit(); } },
        ]));
    };

    tray = new Tray(iconPath);
    tray.setIgnoreDoubleClickEvents(true);
    tray.on('click', toggleWindow);
    for (const event of ['show', 'hide', 'minimize', 'restore']) win.on(event, refreshTray);
    ipcMain.on('tray:connection-status', (_event, status) => {
        if (!['disconnected', 'connecting', 'reconnecting', 'connected'].includes(status)) return;
        connectionStatus = status;
        if (status === 'disconnected') channelCount = 0;
        refreshTray();
    });
    ipcMain.on('sendChannelstoConsole', (_event, count) => {
        if (Number.isInteger(count) && count >= 0) {
            channelCount = count;
            refreshTray();
        }
    });
    refreshTray();

    if (fs.existsSync(configPath)) {
        const configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        configs.NotifyTray = false;
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
}

function exportTray() {
    const { app, Notification } = require('@electron/remote');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    const icon = assetPath(app, 'ppL.ico');
    const resize = (path) => createFromPath(path).resize({ height: '256', width: '256', quality: 'best' });
    if (fs.existsSync(configPath)) {
        const configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        if (!configs.NotifyTray) {
            new Notification({
                icon: resize(icon), title: 'SM Lurker em segundo plano',
                body: 'Para abrir a janela clique sobre o ícone. Para mais opções clique com o botão direito do mouse sobre o ícone',
                timeoutType: 'default', urgency: 'low',
            }).show();
            configs.NotifyTray = true;
            fs.writeFileSync(configPath, JSON.stringify(configs));
        }
    }
}
