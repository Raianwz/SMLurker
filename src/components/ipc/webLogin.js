const path = require('node:path');
const { createWebLogin } = require('../twitch/webLogin');
const { createWebSession } = require('../twitch/webSession');
const { createDirectSession } = require('../twitch/directSession');
const { createDirectLogin, readClientId } = require('../twitch/directLogin');

function createWebLoginController({ app, ipcMain, shell, Notification, safeStorage, getMainWindow, fromMainWindow }) {
    const webSession = createWebSession({ directory: path.join(app.getPath('userData'), 'Config'), safeStorage });
    const directClientId = readClientId({ isPackaged: app.isPackaged, appRoot: app.getAppPath?.() });
    const directLogin = directClientId ? createDirectLogin({ clientId: directClientId }) : null;
    const directSession = directLogin ? createDirectSession({ directory: path.join(app.getPath('userData'), 'Config'), safeStorage, directLogin }) : null;
    let directAttempt = null;
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
        directAttempt?.abort();
        directAttempt = null;
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

    ipcMain.handle('direct-login:start', async (event) => {
        fromMainWindow(event);
        if (ircIsActive()) return { ok: false, message: 'Desconecte-se dos canais antes de trocar de conta.' };
        if (!directLogin || !directSession) return { ok: false, message: 'CLIENT_ID do Electron não configurado.' };
        if (directAttempt) return { ok: false, message: 'Um login direto já está em andamento.' };
        webLogin.cancel?.();
        const controller = new AbortController();
        directAttempt = controller;
        try {
            const device = await directLogin.begin(controller.signal);
            void shell.openExternal(device.verificationUri).catch(() => {
                queueResult({ type: 'error', source: 'direct', message: 'Não foi possível abrir a Twitch. Abra twitch.tv/activate manualmente.' });
            });
            void directLogin.poll(device, controller.signal).then(async (tokens) => {
                if (directAttempt !== controller || ircIsActive()) return;
                const username = await directLogin.validate(tokens.access_token);
                if (!username) throw new Error('A Twitch devolveu um token inválido para este aplicativo.');
                const remembered = directSession.save({ username, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
                if (!remembered) throw new Error('Não foi possível proteger a sessão direta neste sistema.');
                queueResult({ type: 'success', source: 'direct', username, accessToken: tokens.access_token, remembered });
            }).catch((error) => {
                if (directAttempt === controller && !controller.signal.aborted) queueResult({ type: 'error', source: 'direct', message: error.message });
            }).finally(() => { if (directAttempt === controller) directAttempt = null; });
            return { ok: true, userCode: device.userCode, verificationUri: device.verificationUri, expiresIn: device.expiresIn };
        } catch (error) {
            directAttempt = null;
            return { ok: false, message: error.message || 'Não foi possível iniciar o login direto.' };
        }
    });

    ipcMain.handle('direct-login:cancel', (event) => {
        fromMainWindow(event);
        directAttempt?.abort();
        directAttempt = null;
        return { ok: true };
    });

    ipcMain.handle('web-login:restore', async () => {
        if (directSession) {
            const direct = await directSession.restore();
            if (direct.type !== 'none') return direct;
        }
        const result = await webSession.restore();
        if (result.requiresLogin) requestLoginAgain();
        return result;
    });

    ipcMain.handle('web-login:invalid', () => {
        try { webSession.clear(); } catch { /* A interface ainda solicitará um novo login. */ }
        requestLoginAgain();
        return { ok: true };
    });

    ipcMain.handle('direct-login:invalid', (event) => {
        fromMainWindow(event);
        directSession?.clear();
        return { ok: true };
    });

    ipcMain.handle('direct-login:refresh', async (event) => {
        fromMainWindow(event);
        return directSession ? directSession.renew() : { type: 'error', requiresLogin: true, message: 'Login direto indisponível.' };
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

    ipcMain.handle('direct-login:logout', (event) => {
        fromMainWindow(event);
        if (ircIsActive()) return { ok: false, message: 'Desconecte-se dos canais antes de sair da conta.' };
        try { directAttempt?.abort(); directAttempt = null; directSession?.clear(); queuedResult = null; return { ok: true }; }
        catch { return { ok: false, message: 'Não foi possível apagar a sessão direta salva.' }; }
    });

    return {
        handleCallback: (url) => directAttempt ? false : webLogin.handleCallback(url),
        flushResult,
        rendererLoading: () => { rendererReady = false; },
        shouldForceShowLogin: () => forceShowLogin,
    };
}

module.exports = { createWebLoginController };
