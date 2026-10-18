const tmi = api.tw.tmi;
const changeAppSide = (btn, dest) => api.cr.tr.changeside(btn, dest);
const BlockLogin = (value) => api.cr.tr.blockinput(value);
const createProfile = async () => api.tw.data.createProfile(
    useLegacyLogin || !webCredentials ? document.getElementById('pass').value : webCredentials.pass
);
const loadUserData = async () => api.tw.data.loadUserData();
const saveUserData = async (user, pass) => api.tw.data.saveUserData(user, pass);
const updateTrayStatus = (status) => api.cr.ipc.send('tray:connection-status', status);
let client = null;
let legacyAvailable = false;
let webCredentials = null;
let autoConnectEnabled = false;
let useLegacyLogin = false;
let appActionInProgress = false;
let connectionPreparationInProgress = false;
let retryAction = null;
let liveStatusTimer = null;
let liveStatusChangeTimer = null;
let liveStatusRun = 0;
const LIVE_STATUS_REFRESH_MS = 2 * 60 * 1000;
const MAX_CONNECTED_CHANNELS = 100;
const CHANNEL_SELECTION_KEY = 'smlurker:selected-channels';

async function chooseChannelsToConnect() {
    const saved = [...new Set(await api.channels.list())];
    if (saved.length <= MAX_CONNECTED_CHANNELS) return saved;

    const dialog = document.getElementById('channelSelectionDialog');
    const list = document.getElementById('channelSelectionItems');
    const count = document.getElementById('channelSelectionCount');
    const confirm = document.getElementById('channelSelectionConfirm');
    const search = document.getElementById('channelSelectionSearch');
    const matches = document.getElementById('channelSelectionMatches');
    const empty = document.getElementById('channelSelectionEmpty');
    let previous = [];
    try {
        const stored = JSON.parse(localStorage.getItem(CHANNEL_SELECTION_KEY));
        if (Array.isArray(stored)) previous = stored;
    } catch { /* Use os primeiros canais da lista se a preferência não puder ser lida. */ }
    const selected = new Set(previous.length ? previous.filter(channel => saved.includes(channel)).slice(0, MAX_CONNECTED_CHANNELS)
        : saved.slice(0, MAX_CONNECTED_CHANNELS));
    const inputs = [];
    const updateCount = () => {
        count.textContent = `${selected.size} de ${MAX_CONNECTED_CHANNELS} canais selecionados · ${saved.length} na lista`;
        confirm.disabled = selected.size === 0;
    };
    const rows = saved.map(channel => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        const name = document.createElement('span');
        label.className = 'channel-selection-item';
        checkbox.type = 'checkbox';
        checkbox.checked = selected.has(channel);
        checkbox.setAttribute('aria-label', `Conectar ${channel}`);
        name.textContent = channel;
        checkbox.addEventListener('change', () => {
            if (checkbox.checked && selected.size >= MAX_CONNECTED_CHANNELS) {
                checkbox.checked = false;
                count.textContent = `O limite é de ${MAX_CONNECTED_CHANNELS} canais. Desmarque um para escolher ${channel}.`;
                return;
            }
            if (checkbox.checked) selected.add(channel);
            else selected.delete(channel);
            updateCount();
        });
        inputs.push(checkbox);
        label.append(checkbox, name);
        return label;
    });
    list.replaceChildren(...rows);
    search.value = '';
    const filterRows = () => {
        const query = search.value.trim().toLowerCase().replace(/^#/, '');
        let visible = 0;
        rows.forEach((row, index) => {
            row.hidden = !saved[index].replace(/^#/, '').toLowerCase().includes(query);
            if (!row.hidden) visible++;
        });
        matches.textContent = query ? `${visible} de ${saved.length} canais encontrados` : '';
        empty.hidden = visible !== 0;
    };
    search.oninput = filterRows;
    filterRows();
    updateCount();
    setConnectionStatus('info', `Sua lista tem ${saved.length} canais. Somente 100 serão conectados; escolha quais deseja entrar.`);
    return new Promise(resolve => {
        let finished = false;
        const finish = (channels) => {
            if (finished) return;
            finished = true;
            dialog.removeEventListener('close', onClose);
            if (dialog.open) dialog.close();
            resolve(channels);
        };
        const onClose = () => finish(null);
        dialog.addEventListener('close', onClose);
        document.getElementById('channelSelectionFirst').onclick = () => {
            selected.clear();
            saved.slice(0, MAX_CONNECTED_CHANNELS).forEach(channel => selected.add(channel));
            inputs.forEach((input, index) => { input.checked = index < MAX_CONNECTED_CHANNELS; });
            updateCount();
        };
        document.getElementById('channelSelectionClear').onclick = () => {
            selected.clear();
            inputs.forEach(input => { input.checked = false; });
            updateCount();
        };
        document.getElementById('channelSelectionCancel').onclick = () => finish(null);
        confirm.onclick = () => {
            if (!selected.size) return;
            const channels = saved.filter(channel => selected.has(channel));
            try { localStorage.setItem(CHANNEL_SELECTION_KEY, JSON.stringify(channels)); }
            catch { /* A escolha ainda vale para esta conexão. */ }
            finish(channels);
        };
        dialog.showModal();
        search.focus();
    });
}

function stopLiveStatus() {
    liveStatusRun++;
    clearTimeout(liveStatusTimer);
    clearTimeout(liveStatusChangeTimer);
    liveStatusTimer = null;
    liveStatusChangeTimer = null;
    const status = document.getElementById('liveStatus');
    status.hidden = true;
    status.textContent = '';
    status.title = '';
}

async function refreshLiveStatus(run) {
    if (run !== liveStatusRun || !client) return;
    const status = document.getElementById('liveStatus');
    status.hidden = false;
    status.dataset.state = 'checking';
    status.textContent = 'Ao vivo: verificando...';
    status.title = '';
    try {
        const joined = tmi.channels();
        if (!Array.isArray(joined) || joined.length === 0) {
            throw new Error('Lista de canais conectados indisponível.');
        }
        const logins = joined.map((channel) => channel.replace(/^#/, '')).filter(Boolean);
        if (logins.length !== joined.length) throw new Error('Lista de canais conectados incompleta.');
        const channels = await api.streams.status(logins);
        if (run !== liveStatusRun) return;
        if (channels.length !== logins.length) throw new Error('Resposta incompleta dos canais.');
        const confirmed = channels.filter((channel) => !channel.stale);
        const live = confirmed.filter((channel) => channel.is_live === true);
        const unknown = channels.length - confirmed.filter((channel) => typeof channel.is_live === 'boolean').length;
        status.dataset.state = unknown === channels.length && channels.length ? 'unknown' : 'ready';
        status.textContent = unknown === channels.length && channels.length
            ? 'Ao vivo: indisponível'
            : `Ao vivo: ${live.length}${unknown ? '+' : ''}`;
        status.title = unknown
            ? `${unknown} ${unknown === 1 ? 'canal sem confirmação atual' : 'canais sem confirmação atual'}.`
            : live.length ? `Ao vivo: ${live.map((channel) => channel.login).join(', ')}` : 'Nenhum canal conectado está ao vivo.';
    } catch {
        if (run !== liveStatusRun) return;
        status.dataset.state = 'unknown';
        status.textContent = 'Ao vivo: indisponível';
        status.title = 'Não foi possível consultar os canais ao vivo.';
    } finally {
        if (run === liveStatusRun) {
            liveStatusTimer = setTimeout(() => void refreshLiveStatus(run), LIVE_STATUS_REFRESH_MS);
        }
    }
}

function startLiveStatus() {
    stopLiveStatus();
    if (typeof api.streams?.status !== 'function') return;
    void refreshLiveStatus(liveStatusRun);
}

function queueLiveStatusRefresh() {
    clearTimeout(liveStatusChangeTimer);
    liveStatusChangeTimer = setTimeout(() => {
        liveStatusChangeTimer = null;
        if (client) startLiveStatus();
    }, 2000);
}

document.getElementById('retryConnection').addEventListener('click', () => {
    if (!retryAction || client) return;
    const action = retryAction;
    retryAction = null;
    document.getElementById('retryConnection').hidden = true;
    void action();
});

async function disconnectForAppAction() {
    if (!client) return;
    let timeout;
    try {
        await Promise.race([
            Promise.resolve().then(() => tmi.dc()).catch(() => {}),
            new Promise((resolve) => { timeout = setTimeout(resolve, 3000); }),
        ]);
    } finally {
        clearTimeout(timeout);
        client = null;
        stopLiveStatus();
        updateTrayStatus('disconnected');
    }
}

api.reload.onRequested(async (action) => {
    if (appActionInProgress || !['reload', 'restart'].includes(action)) return;
    const connected = Boolean(client);
    if (connected || action === 'restart') {
        const answer = api.cr.dg.showMB({
            type: 'question',
            title: action === 'reload' ? 'Recarregar SMLurker' : 'Reiniciar SMLurker',
            message: action === 'reload' ? 'Deseja recarregar o SMLurker?' : 'Deseja reiniciar agora?',
            detail: connected
                ? `Você ainda está conectado à Twitch. Deseja realmente sair e ${action === 'reload' ? 'recarregar' : 'reiniciar'}?`
                : undefined,
            buttons: ['Não', 'Sim'],
            defaultId: 0,
            cancelId: 0,
            noLink: true,
        });
        if (answer !== 1) return;
    }
    appActionInProgress = true;
    await disconnectForAppAction();
    if (action === 'reload') api.cr.ipc.send('sendtoCleanConsole');
    api.reload.perform(action);
});

function isWebAuthError(error) {
    const message = typeof error?.message === 'string' ? error.message : String(error);
    return /login unsuccessful|login authentication failed|error logging in|improperly formatted auth|invalid oauth token|invalid access token/i.test(message);
}

async function showWebProfile(username) {
    try {
        const profile = await createProfile();
        if (webCredentials?.username !== username || useLegacyLogin || !profile) return;
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = profile.logo;
        avatar.alt = `Perfil de ${profile.displayName}`;
        avatar.title = avatar.alt;
        avatar.style.color = profile.userColor;
        const tooltip = document.createElement('p');
        tooltip.className = 'mb-tooltip';
        tooltip.textContent = avatar.alt;
        document.getElementById('login_box').replaceChildren(avatar, tooltip);
    } catch {
        // A foto é opcional: falhas de perfil não impedem a entrada nos canais.
    }
}

function renderLoginMode() {
    const activePanel = useLegacyLogin && legacyAvailable
        ? 'legacyLoginPanel'
        : webCredentials ? 'webReadyPanel' : legacyAvailable ? 'legacyLoginPanel' : 'newLoginPanel';
    for (const panelId of ['legacyLoginPanel', 'newLoginPanel', 'webReadyPanel']) {
        const panel = document.getElementById(panelId);
        if (panelId === activePanel) panel.classList.remove('none');
        else panel.classList.add('none');
    }
    const legacyButton = document.getElementById('btnUseLegacyLogin');
    if (legacyAvailable) legacyButton.classList.remove('none');
    else legacyButton.classList.add('none');
    if (webCredentials) document.getElementById('webAccount').textContent = `Twitch: @${webCredentials.username}`;
}

async function restoreLoginState() {
    setConnectionStatus('checking', 'Verificando sessão salva...');
    const [legacy, saved] = await Promise.allSettled([loadUserData(), api.auth.restoreWebLogin()]);
    legacyAvailable = legacy.status === 'fulfilled' && legacy.value.hasCredentials;
    autoConnectEnabled = legacy.status === 'fulfilled' && legacy.value.autoConnect === true;
    if (client) return;
    if (webCredentials) {
        if (autoConnectEnabled) void conectarCanaisWeb();
        return;
    }
    const restored = saved.status === 'fulfilled' ? saved.value : { type: 'error', message: 'Não foi possível verificar a sessão salva.' };
    if (restored.type === 'success' && !webCredentials) {
        applyWebLogin(restored, true);
        if (autoConnectEnabled) void conectarCanaisWeb();
    } else {
        renderLoginMode();
        if (legacyAvailable && autoConnectEnabled && !restored.requiresLogin) {
            void entrarTwitch();
            return;
        }
        if (restored.type === 'error') {
            setConnectionStatus('error', legacyAvailable && restored.requiresLogin
                ? 'A sessão do login Web não está mais válida. Para usar o OAuth salvo, clique em Entrar.'
                : restored.message, { retry: restored.requiresLogin ? iniciarLoginWeb : restoreLoginState });
        } else if (legacy.status === 'rejected') {
            setConnectionStatus('error', 'Não foi possível carregar as credenciais salvas. Entre com a Twitch.', { retry: restoreLoginState });
        }
        else if (!legacyAvailable || !autoConnectEnabled) showLoginStatus('');
    }
}

void restoreLoginState();

function setConnectionStatus(state, message, { retry = null, inlineMissingChannels = false } = {}) {
    const text = String(message);
    const classicError = document.getElementById('classicLoginError');
    classicError.textContent = inlineMissingChannels ? text : '';
    classicError.hidden = !inlineMissingChannels;
    const status = document.getElementById('msgStatus');
    status.textContent = inlineMissingChannels ? '' : text;
    status.setAttribute('data-state', state);
    const connectedStatus = document.getElementById('connectedStatus');
    connectedStatus.textContent = ['joining', 'connected', 'reconnecting'].includes(state) ? text : '';
    connectedStatus.setAttribute('data-state', state);
    if (state === 'connected') startLiveStatus();
    else stopLiveStatus();
    retryAction = retry;
    const retryButton = document.getElementById('retryConnection');
    retryButton.hidden = !retry;
    retryButton.textContent = retry === iniciarLoginWeb ? 'Entrar novamente' : 'Tentar novamente';
}

function showLoginStatus(message, inlineMissingChannels = false) {
    setConnectionStatus('info', message, { inlineMissingChannels });
}

function readLoginCredentials() {
    const username = document.getElementById('username').value.toLowerCase();
    const pass = document.getElementById('pass').value;
    if (!username.trim() || !pass.trim()) {
        throw new Error('Por favor preencha os campos Username e OAuth');
    }
    if (username.startsWith(' ') || pass.startsWith(' ') || pass.includes(' ')) {
        throw new Error('Por favor insira um Username e OAuth válidos');
    }
    return { username, pass };
}

function resetLoginButton() {
    const btnEntrar = document.getElementById('btnEntrar');
    btnEntrar.value = 'Entrar nos canais';
    btnEntrar.classList.remove('loading', 'conectado');
    btnEntrar.onclick = entrarTwitch;
}

async function conectarCanais({ username, pass, fromWeb }) {
    if (connectionPreparationInProgress || client) return;
    connectionPreparationInProgress = true;
    const btnEntrar = document.getElementById(fromWeb ? 'btnConnectChannels' : 'btnEntrar');
    let selectedChannels;
    try {
        selectedChannels = await chooseChannelsToConnect();
    } catch {
        setConnectionStatus('error', 'Não foi possível ler sua lista de canais.', {
            retry: fromWeb ? conectarCanaisWeb : entrarTwitch,
        });
        return;
    } finally {
        connectionPreparationInProgress = false;
    }
    if (selectedChannels === null) {
        showLoginStatus('Conexão cancelada. Escolha os canais quando quiser entrar.');
        return;
    }
    BlockLogin(true);
    updateTrayStatus('connecting');
    btnEntrar.value = '';
    btnEntrar.classList.add('loading');
    btnEntrar.onclick = null;
    setConnectionStatus('connecting', 'Preparando conexão com a Twitch...');

    const options = {
        options: { debug: false, skipUpdatingEmotesets: true },
        connection: {
            reconnect: true,
            secure: true,
        },
        identity: {
            username: username,
            password: pass,
        },
        channels: [],
    };

    try {
        client = tmi.ini(options);
        const activeClient = client;
        let channelsJoined = false;
        if (typeof activeClient.on === 'function') {
            activeClient.on('disconnected', () => {
                if (channelsJoined && client === activeClient) {
                    updateTrayStatus('reconnecting');
                    setConnectionStatus('reconnecting', 'Reconectando ao chat da Twitch...');
                }
            });
            activeClient.on('connected', () => {
                if (channelsJoined && client === activeClient) {
                    updateTrayStatus('connected');
                    setConnectionStatus('connected', 'Canais conectados.');
                }
            });
            for (const event of ['join', 'part']) {
                activeClient.on(event, (_channel, _username, self) => {
                    if (self && channelsJoined && client === activeClient) queueLiveStatusRefresh();
                });
            }
        }
        setConnectionStatus('connecting', 'Conectando ao chat da Twitch...');
        await tmi.cn();
        setConnectionStatus('joining', 'Entrando nos canais...');
        if (!fromWeb) {
            try { await createProfile(); } catch { /* A foto não deve impedir a conexão. */ }
        }
        await api.tw.jcnc(selectedChannels);
        channelsJoined = true;

        if (!fromWeb) await saveUserData(username, pass);
        if (fromWeb) document.getElementById('pass').value = '';
        api.console.manager();
        api.tw.jp();
        changeAppSide(1);
        setConnectionStatus('connected', 'Canais conectados.');
        btnEntrar.value = 'Desconectar';
        btnEntrar.classList.remove('loading');
        btnEntrar.classList.add('conectado');
        btnEntrar.onclick = sairTwitch;
        updateTrayStatus('connected');
    } catch (error) {
        const invalidWebToken = fromWeb && isWebAuthError(error);
        BlockLogin(false);
        if (fromWeb) document.getElementById('pass').value = '';
        const errorMessage = typeof error?.message === 'string' ? error.message : String(error);
        if (fromWeb) {
            btnEntrar.value = 'Entrar nos canais';
            btnEntrar.classList.remove('loading', 'conectado');
            btnEntrar.onclick = conectarCanaisWeb;
        } else resetLoginButton();
        if (client) {
            try { await tmi.dc(); } catch { /* A conexão pode não ter sido aberta. */ }
            client = null;
        }
        changeAppSide(0);
        updateTrayStatus('disconnected');
        if (invalidWebToken) {
            webCredentials = null;
            document.getElementById('login_box').innerHTML = 'account_circle <p class="mb-tooltip">Login</p>';
            renderLoginMode();
            try { await api.auth.invalidateWebLogin(); } catch { /* A mensagem de login já está visível. */ }
        }
        setConnectionStatus('error', invalidWebToken
            ? 'A sessão da Twitch não é mais válida. Entre com a Twitch novamente.'
            : errorMessage, {
            inlineMissingChannels: !fromWeb && errorMessage.startsWith('Nenhum canal adicionado'),
            retry: invalidWebToken ? iniciarLoginWeb : fromWeb ? conectarCanaisWeb : entrarTwitch,
        });
    }
}

async function entrarTwitch() {
    if (client) return;
    document.getElementById('btnEntrar').blur();
    showLoginStatus('');
    let credentials;
    try {
        credentials = readLoginCredentials();
    } catch (error) {
        setConnectionStatus('error', error.message);
        return;
    }
    await conectarCanais({ ...credentials, fromWeb: false });
}

async function conectarCanaisWeb() {
    if (client || !webCredentials) return;
    document.getElementById('btnConnectChannels').blur();
    await conectarCanais({ ...webCredentials, fromWeb: true });
}

async function iniciarLoginWeb() {
    if (useLegacyLogin && webCredentials) {
        useLegacyLogin = false;
        document.getElementById('username').value = webCredentials.username;
        document.getElementById('pass').value = '';
        renderLoginMode();
        showLoginStatus('Login Web pronto. Clique em Entrar nos canais quando quiser iniciar.');
        void showWebProfile(webCredentials.username);
        return;
    }
    try {
        const result = await api.auth.startWebLogin();
        if (result.ok) setConnectionStatus('checking', 'Conclua o login no navegador para voltar ao SMLurker.');
        else setConnectionStatus('error', result.message, { retry: iniciarLoginWeb });
    } catch {
        setConnectionStatus('error', 'Não foi possível abrir o login no navegador. Tente novamente.', { retry: iniciarLoginWeb });
    }
}

async function voltarLoginLegado() {
    if (client || !legacyAvailable) return;
    try {
        const saved = await loadUserData();
        if (!saved.hasCredentials) {
            legacyAvailable = false;
            renderLoginMode();
            showLoginStatus('As credenciais antigas não estão mais disponíveis. Entre com a Twitch.');
            return;
        }
        useLegacyLogin = true;
        document.getElementById('login_box').innerHTML = 'account_circle <p class="mb-tooltip">Login</p>';
        renderLoginMode();
        showLoginStatus('');
    } catch {
        showLoginStatus('Não foi possível abrir o login com OAuth salvo.');
    }
}

async function sairDaContaWeb() {
    if (client || !webCredentials) return;
    try {
        const result = await api.auth.logoutWebLogin();
        if (!result.ok) {
            showLoginStatus(result.message);
            return;
        }
        webCredentials = null;
        useLegacyLogin = false;
        document.getElementById('username').value = '';
        document.getElementById('pass').value = '';
        document.getElementById('login_box').innerHTML = 'account_circle <p class="mb-tooltip">Login</p>';
        if (legacyAvailable) {
            try {
                const saved = await loadUserData();
                legacyAvailable = saved.hasCredentials;
            } catch { legacyAvailable = false; }
        }
        renderLoginMode();
        showLoginStatus('Você saiu da conta Twitch neste aplicativo.');
    } catch {
        showLoginStatus('Não foi possível sair da conta. Tente novamente.');
    }
}

function applyWebLogin(result, restored = false) {
    if (typeof result.username !== 'string' || typeof result.accessToken !== 'string' || !result.username || !result.accessToken) {
        setConnectionStatus('error', 'O login retornou dados incompletos. Tente novamente.', { retry: iniciarLoginWeb });
        return;
    }
    webCredentials = { username: result.username, pass: `oauth:${result.accessToken}` };
    useLegacyLogin = false;
    document.getElementById('username').value = result.username;
    document.getElementById('pass').value = '';
    renderLoginMode();
    setConnectionStatus('ready', restored
        ? 'Sessão restaurada. Clique em Entrar nos canais quando quiser iniciar.'
        : result.remembered === false
            ? 'Login concluído, mas não foi possível salvar a sessão. Um novo login será necessário após reiniciar.'
            : 'Login concluído. Clique em Entrar nos canais quando quiser iniciar.');
    void showWebProfile(result.username);
}

api.auth.onWebLoginResult(async (result) => {
    if (result.type === 'error') {
        if (client) document.getElementById('msgStatus').textContent = result.message;
        else setConnectionStatus('error', result.message, { retry: iniciarLoginWeb });
        return;
    }
    if (result.type !== 'success') return;
    if (client) {
        document.getElementById('msgStatus').textContent = 'Desconecte-se dos canais antes de entrar pelo navegador novamente.';
        return;
    }
    applyWebLogin(result);
    if (autoConnectEnabled) void conectarCanaisWeb();
});

async function sairTwitch() {
    await tmi.dc()
    const getInner = (e, txt) => document.getElementById(e).innerHTML = txt
    const btnEntrar = document.getElementById('btnEntrar');
    const btnConnectChannels = document.getElementById('btnConnectChannels');

    changeAppSide(0)
    BlockLogin(false)
    setTimeout(() => {
        getInner('jc_Status', '')
        getInner('UserBox', '');
    }, 200)

    client = null;
    updateTrayStatus('disconnected')
    btnEntrar.blur();
    resetLoginButton();
    btnConnectChannels.value = 'Entrar nos canais';
    btnConnectChannels.classList.remove('loading', 'conectado');
    btnConnectChannels.onclick = conectarCanaisWeb;
    renderLoginMode();
    setConnectionStatus('ready', 'Desconectado dos canais. Você pode entrar novamente quando quiser.');
    api.cr.ipc.send('sendtoCleanConsole')
}
