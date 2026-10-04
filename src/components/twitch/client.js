const tmi = api.tw.tmi;
const changeAppSide = (btn, dest) => api.cr.tr.changeside(btn, dest);
const BlockLogin = (value) => api.cr.tr.blockinput(value);
const createProfile = async () => api.tw.data.createProfile();
const loadUserData = async () => api.tw.data.loadUserData();
const saveUserData = async (user, pass) => api.tw.data.saveUserData(user, pass);
let client = null;
let legacyAvailable = false;
let webCredentials = null;

async function showWebProfile(username) {
    try {
        const profile = await createProfile();
        if (webCredentials?.username !== username || !profile) return;
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
    const activePanel = webCredentials ? 'webReadyPanel' : legacyAvailable ? 'legacyLoginPanel' : 'newLoginPanel';
    for (const panelId of ['legacyLoginPanel', 'newLoginPanel', 'webReadyPanel']) {
        const panel = document.getElementById(panelId);
        if (panelId === activePanel) panel.classList.remove('none');
        else panel.classList.add('none');
    }
    if (webCredentials) document.getElementById('webAccount').textContent = `Twitch: @${webCredentials.username}`;
}

loadUserData().then(({ hasCredentials, autoConnect }) => {
    legacyAvailable = hasCredentials;
    renderLoginMode();
    if (legacyAvailable && autoConnect) entrarTwitch();
}).catch(() => {
    renderLoginMode();
    showLoginStatus('Não foi possível carregar as credenciais salvas. Entre com a Twitch.');
});

const showLoginStatus = (message) => {
    document.getElementById('msgStatus').textContent = String(message);
};

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
        if (!fromWeb && document.querySelector('section#user_box').textContent.includes('account_circle')) {
            await createProfile();
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
    try {
        const result = await api.auth.startWebLogin();
        showLoginStatus(result.ok
            ? 'Conclua o login no navegador para voltar ao SMLurker.'
            : result.message);
    } catch {
        showLoginStatus('Não foi possível abrir o login no navegador. Tente novamente.');
    }
}

api.auth.onWebLoginResult(async (result) => {
    const status = document.getElementById('msgStatus');
    if (result.type === 'error') {
        status.textContent = result.message;
        return;
    }
    if (result.type !== 'success') return;
    if (client) {
        status.textContent = 'Saia da conta atual antes de entrar pelo navegador novamente.';
        return;
    }

    if (typeof result.username !== 'string' || typeof result.accessToken !== 'string' || !result.username || !result.accessToken) {
        status.textContent = 'O login retornou dados incompletos. Tente novamente.';
        return;
    }
    webCredentials = { username: result.username, pass: `oauth:${result.accessToken}` };
    document.getElementById('username').value = result.username;
    document.getElementById('pass').value = '';
    renderLoginMode();
    status.textContent = 'Login concluído. Clique em Entrar nos canais quando quiser iniciar.';
    void showWebProfile(result.username);
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
