const tmi = api.tw.tmi;
const changeAppSide = (btn, dest) => api.cr.tr.changeside(btn, dest);
const BlockLogin = (value) => api.cr.tr.blockinput(value);
const createProfile = async () => api.tw.data.createProfile();
const loadUserData = async () => api.tw.data.loadUserData();
const saveUserData = async (user, pass) => api.tw.data.saveUserData(user, pass);
let client = null;
loadUserData();

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
    const btnEntrar = document.getElementById('btnEntrar');
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
        if (document.querySelector('section#user_box').textContent.includes('account_circle')) {
            await createProfile();
        }
        await api.tw.jcnc();

        if (!fromWeb) await saveUserData(username, pass);
        if (fromWeb) document.getElementById('pass').value = '';
        api.console.manager();
        api.tw.jp();
        changeAppSide(1);
        showLoginStatus('Entrou nos canais!');
        btnEntrar.value = 'Sair';
        btnEntrar.classList.remove('loading');
        btnEntrar.classList.add('conectado');
        btnEntrar.onclick = sairTwitch;
    } catch (error) {
        BlockLogin(false);
        if (fromWeb) document.getElementById('pass').value = '';
        showLoginStatus(typeof error?.message === 'string' ? error.message : String(error));
        resetLoginButton();
        if (client) {
            try { await tmi.dc(); } catch { /* A conexão pode não ter sido aberta. */ }
            client = null;
        }
    }
}

async function entrarTwitch(options = {}) {
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
    await conectarCanais({ ...credentials, fromWeb: options.fromWeb === true });
}

async function iniciarLoginWeb() {
    const result = await api.auth.startWebLogin();
    document.getElementById('msgStatus').textContent = result.ok
        ? 'Conclua o login no navegador para voltar ao SMLurker.'
        : result.message;
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

    document.getElementById('username').value = result.username;
    document.getElementById('pass').value = `oauth:${result.accessToken}`;
    await entrarTwitch({ fromWeb: true });
});

async function sairTwitch() {
    await tmi.dc()
    const getInner = (e, txt) => document.getElementById(e).innerHTML = txt
    const btnEntrar = document.getElementById('btnEntrar');

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
    api.cr.ipc.send('sendtoCleanConsole')
}
