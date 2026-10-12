const path = require('node:path');
const { createWebLogin } = require('../twitch/webLogin');
const { createWebSession } = require('../twitch/webSession');

function createWebLoginController({ app, ipcMain, shell, Notification, safeStorage, getMainWindow, fromMainWindow }) {
    const webSession = createWebSession({ directory: path.join(app.getPath('userData'), 'Config'), safeStorage });
    let queuedResult = null;
    let forceShowLogin = false;
    let ircConnectionStatus = 'disconnected';
    const ircIsActive = () => ircConnectionStatus !== 'disconnected';

    ipcMain.on('tray:connection-status', (event, status) => {
        if (event.sender === getMainWindow()?.webContents &&
            ['disconnected', 'connecting', 'reconnecting', 'connected'].includes(status)) {
            ircConnectionStatus = status;
        }
    });

    function flushResult() {
        const window = getMainWindow();
        if (!queuedResult || !window || window.isDestroyed() || window.webContents.isLoadingMainFrame()) return;
        window.webContents.send('web-login:result', queuedResult);
        queuedResult = null;
    }

    function requestLoginAgain() {
        forceShowLogin = true;
        const window = getMainWindow();
        if (window && !window.isDestroyed()) {
            if (window.isMinimized()) window.restore();
            window.show();
            window.focus();
        }
        if (Notification.isSupported()) {
            try {
                const notification = new Notification({
                    title: 'Login da Twitch necessário',
                    body: 'A sessão expirou ou foi recusada. Abra o SMLurker para entrar novamente.',
                });
                notification.on('click', () => {
                    const currentWindow = getMainWindow();
                    if (currentWindow && !currentWindow.isDestroyed()) {
                        if (currentWindow.isMinimized()) currentWindow.restore();
                        currentWindow.show();
                        currentWindow.focus();
                    }
                });
                notification.show();
            } catch { /* A janela e a mensagem de login continuam disponíveis. */ }
        }
    }

    const webLogin = createWebLogin({
        isPackaged: app.isPackaged,
        openExternal: (url) => shell.openExternal(url),
        onResult: (result) => {
            if (result.type === 'success') {
                if (ircIsActive()) {
                    queuedResult = { type: 'error', message: 'Desconecte-se dos canais antes de trocar de conta.' };
                    flushResult();
                    return;
                }
                forceShowLogin = false;
                let remembered = false;
                try {
                    remembered = webSession.save(result);
                    if (!remembered) webSession.clear();
                } catch {
                    try { webSession.clear(); } catch { /* A sessão atual ainda pode ser usada em memória. */ }
                }
                result = { ...result, remembered };
            }
            queuedResult = result;
            flushResult();
        },
    });

    ipcMain.handle('web-login:start', async () => {
        if (ircIsActive()) return { ok: false, message: 'Desconecte-se dos canais antes de trocar de conta.' };
        try {
            await webLogin.start();
            return { ok: true };
        } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível iniciar o login pelo navegador.' };
        }
    });

    ipcMain.handle('web-login:restore', async () => {
        const result = await webSession.restore();
        if (result.requiresLogin) requestLoginAgain();
        return result;
    });

    ipcMain.handle('web-login:invalid', () => {
        try { webSession.clear(); } catch { /* A interface ainda solicitará um novo login. */ }
        requestLoginAgain();
        return { ok: true };
    });

    ipcMain.handle('web-login:logout', (event) => {
        fromMainWindow(event);
        if (ircIsActive()) return { ok: false, message: 'Desconecte-se dos canais antes de sair da conta.' };
        try {
            webSession.clear();
            queuedResult = null;
            forceShowLogin = false;
            return { ok: true };
        } catch {
            return { ok: false, message: 'Não foi possível apagar a sessão Web salva.' };
        }
    });

    return {
        handleCallback: (url) => webLogin.handleCallback(url),
        flushResult,
        shouldForceShowLogin: () => forceShowLogin,
    };
}

module.exports = { createWebLoginController };
