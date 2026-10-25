const path = require('node:path');
const { createWebLogin } = require('../twitch/webLogin');
const { createWebSession } = require('../twitch/webSession');

function createWebLoginController({ app, ipcMain, shell, Notification, safeStorage, getMainWindow, fromMainWindow }) {
    const webSession = createWebSession({ directory: path.join(app.getPath('userData'), 'Config'), safeStorage });
    let queuedResult = null;
    let queuedResultId = 0;
    let rendererReady = false;
    let forceShowLogin = false;
    let ircConnectionStatus = 'disconnected';
    let loginNotificationShown = false;
    let notificationLoginStarted = false;
    let loginNoticeGeneration = 0;
    const ircIsActive = () => ircConnectionStatus !== 'disconnected';

    ipcMain.on('tray:connection-status', (event, status) => {
        if (event.sender === getMainWindow()?.webContents &&
            ['disconnected', 'connecting', 'reconnecting', 'connected'].includes(status)) {
            ircConnectionStatus = status;
        }
    });

    function flushResult() {
        const window = getMainWindow();
        if (!rendererReady || !queuedResult || !window || window.isDestroyed() || window.webContents.isLoadingMainFrame()) return;
        window.webContents.send('web-login:result', queuedResult, queuedResultId);
    }

    function queueResult(result) {
        queuedResult = result;
        queuedResultId++;
        flushResult();
    }

    ipcMain.on('web-login:ready', (event) => {
        if (event.sender !== getMainWindow()?.webContents) return;
        rendererReady = true;
        flushResult();
    });

    ipcMain.on('web-login:ack', (event, id) => {
        if (event.sender !== getMainWindow()?.webContents || id !== queuedResultId) return;
        queuedResult = null;
    });

    function focusMainWindow() {
        const window = getMainWindow();
        if (window && !window.isDestroyed()) {
            if (window.isMinimized()) window.restore();
            window.show();
            window.focus();
        }
    }

    async function startWebLogin() {
        if (ircIsActive()) return { ok: false, message: 'Desconecte-se dos canais antes de trocar de conta.' };
        if (forceShowLogin) notificationLoginStarted = true;
        try {
            await webLogin.start();
            return { ok: true };
        } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível iniciar o login pelo navegador.' };
        }
    }

    function requestLoginAgain() {
        forceShowLogin = true;
        focusMainWindow();
        if (Notification.isSupported() && !loginNotificationShown) {
            try {
                const notification = new Notification({
                    title: 'Login da Twitch necessário',
                    body: 'A sessão expirou ou foi recusada. Clique para entrar com a Twitch novamente.',
                });
                let clicked = false;
                const generation = ++loginNoticeGeneration;
                notification.on('click', () => {
                    focusMainWindow();
                    if (clicked || generation !== loginNoticeGeneration ||
                        !forceShowLogin || notificationLoginStarted) return;
                    clicked = true;
                    notificationLoginStarted = true;
                    void startWebLogin().then((result) => {
                        if (!result.ok) {
                            queueResult({ type: 'error', message: result.message });
                        }
                    });
                });
                notification.show();
                loginNotificationShown = true;
            } catch { /* A janela e a mensagem de login continuam disponíveis. */ }
        }
    }

    const webLogin = createWebLogin({
        isPackaged: app.isPackaged,
        openExternal: (url) => shell.openExternal(url),
        onResult: (result) => {
            if (result.type === 'success') {
                if (ircIsActive()) {
                    queueResult({ type: 'error', message: 'Desconecte-se dos canais antes de trocar de conta.' });
                    return false;
                }
                forceShowLogin = false;
                loginNotificationShown = false;
                notificationLoginStarted = false;
                loginNoticeGeneration++;
                let remembered = false;
                try {
                    remembered = webSession.save(result);
                    if (!remembered) webSession.clear();
                } catch {
                    try { webSession.clear(); } catch { /* A sessão atual ainda pode ser usada em memória. */ }
                }
                result = { ...result, remembered };
            }
            queueResult(result);
            return result.type === 'success';
        },
    });

    ipcMain.handle('web-login:start', startWebLogin);

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
            loginNotificationShown = false;
            notificationLoginStarted = false;
            loginNoticeGeneration++;
            return { ok: true };
        } catch {
            return { ok: false, message: 'Não foi possível apagar a sessão Web salva.' };
        }
    });

    return {
        handleCallback: (url) => webLogin.handleCallback(url),
        flushResult,
        rendererLoading: () => { rendererReady = false; },
        shouldForceShowLogin: () => forceShowLogin,
    };
}

module.exports = { createWebLoginController };
