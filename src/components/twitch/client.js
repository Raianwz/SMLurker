const tmi = api.tw.tmi;
const changeAppSide = (btn, dest) => api.cr.tr.changeside(btn, dest);
const BlockLogin = (value) => api.cr.tr.blockinput(value);
const createProfile = async () => api.tw.data.createProfile();
const loadUserData = async () => api.tw.data.loadUserData();
const saveUserData = async (user, pass) => api.tw.data.saveUserData(user, pass);
let client = null;
let legacyAvailable = false;
let webCredentials = null;
let autoConnectEnabled = false;
let useLegacyLogin = false;

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

showLoginStatus('Verificando sessão salva...');
Promise.allSettled([loadUserData(), api.auth.restoreWebLogin()]).then(([legacy, saved]) => {
    legacyAvailable = legacy.status === 'fulfilled' && legacy.value.hasCredentials;
    autoConnectEnabled = legacy.status === 'fulfilled' && legacy.value.autoConnect === true;
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
        if (legacyAvailable && autoConnectEnabled && !restored.requiresLogin) entrarTwitch();
        if (restored.type === 'error') showLoginStatus(restored.message);
        else if (legacy.status === 'rejected') showLoginStatus('Não foi possível carregar as credenciais salvas. Entre com a Twitch.');
        else if (!legacyAvailable || !autoConnectEnabled) showLoginStatus('');
    }
});

function showLoginStatus(message) {
    document.getElementById('msgStatus').textContent = String(message);
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
    btnEntrar.value = 'Entrar';
    btnEntrar.classList.remove('loading', 'conectado');
    btnEntrar.onclick = entrarTwitch;
}

async function conectarCanais({ username, pass, fromWeb }) {
    const btnEntrar = document.getElementById(fromWeb ? 'btnConnectChannels' : 'btnEntrar');
    BlockLogin(true);
    btnEntrar.value = '';
    btnEntrar.classList.add('loading');
    btnEntrar.onclick = null;
    showLoginStatus('Iniciando Client');

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
        showLoginStatus('Tentando conectar');
        await tmi.cn();
        showLoginStatus('Entrando nos canais...');
        if (!fromWeb) {
            try { await createProfile(); } catch { /* A foto não deve impedir a conexão. */ }
        }
        await api.tw.jcnc();

        if (!fromWeb) await saveUserData(username, pass);
        if (fromWeb) document.getElementById('pass').value = '';
        api.console.manager();
        api.tw.jp();
        changeAppSide(1);
        showLoginStatus('Entrou nos canais!');
        btnEntrar.value = 'Desconectar';
        btnEntrar.classList.remove('loading');
        btnEntrar.classList.add('conectado');
        btnEntrar.onclick = sairTwitch;
    } catch (error) {
        const invalidWebToken = fromWeb && isWebAuthError(error);
        BlockLogin(false);
        if (fromWeb) document.getElementById('pass').value = '';
        showLoginStatus(typeof error?.message === 'string' ? error.message : String(error));
        if (fromWeb) {
            btnEntrar.value = 'Entrar nos canais';
            btnEntrar.classList.remove('loading', 'conectado');
            btnEntrar.onclick = conectarCanaisWeb;
        } else resetLoginButton();
        if (client) {
            try { await tmi.dc(); } catch { /* A conexão pode não ter sido aberta. */ }
            client = null;
        }
        if (invalidWebToken) {
            webCredentials = null;
            document.getElementById('login_box').innerHTML = 'account_circle <p class="mb-tooltip">Login</p>';
            renderLoginMode();
            showLoginStatus('A sessão da Twitch não é mais válida. Entre com a Twitch novamente.');
            try { await api.auth.invalidateWebLogin(); } catch { /* A mensagem de login já está visível. */ }
        }
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
        showLoginStatus(error.message);
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
        showLoginStatus(result.ok
            ? 'Conclua o login no navegador para voltar ao SMLurker.'
            : result.message);
    } catch {
        showLoginStatus('Não foi possível abrir o login no navegador. Tente novamente.');
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

function applyWebLogin(result, restored = false) {
    const status = document.getElementById('msgStatus');
    if (typeof result.username !== 'string' || typeof result.accessToken !== 'string' || !result.username || !result.accessToken) {
        status.textContent = 'O login retornou dados incompletos. Tente novamente.';
        return;
    }
    webCredentials = { username: result.username, pass: `oauth:${result.accessToken}` };
    useLegacyLogin = false;
    document.getElementById('username').value = result.username;
    document.getElementById('pass').value = '';
    renderLoginMode();
    status.textContent = restored
        ? 'Sessão restaurada. Clique em Entrar nos canais quando quiser iniciar.'
        : result.remembered === false
            ? 'Login concluído, mas não foi possível salvar a sessão. Um novo login será necessário após reiniciar.'
            : 'Login concluído. Clique em Entrar nos canais quando quiser iniciar.';
    void showWebProfile(result.username);
}

api.auth.onWebLoginResult(async (result) => {
    const status = document.getElementById('msgStatus');
    if (result.type === 'error') {
        status.textContent = result.message;
        return;
    }
    if (result.type !== 'success') return;
    if (client) {
        status.textContent = 'Desconecte-se dos canais antes de entrar pelo navegador novamente.';
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
        getInner('msgStatus', '');
        getInner('UserBox', '');
    }, 200)

    client = null;
    btnEntrar.blur();
    resetLoginButton();
    btnConnectChannels.value = 'Entrar nos canais';
    btnConnectChannels.classList.remove('loading', 'conectado');
    btnConnectChannels.onclick = conectarCanaisWeb;
    renderLoginMode();
    api.cr.ipc.send('sendtoCleanConsole')
}
