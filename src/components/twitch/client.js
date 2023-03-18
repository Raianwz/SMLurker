const tmi = api.tw.tmi;
const changeButtonSide = (btn, dest) => api.cr.tr.changeside(btn, dest);
const BlockLogin = (value) => api.cr.tr.blockinput(value);
const createProfile = async () => api.tw.data.createProfile();
const loadUserData = async () => api.tw.data.loadUserData();
const saveUserData = async (user, pass) => api.tw.data.saveUserData(user, pass)
let client = null;
let gCount = () => api.tw.lv.get(), aCount = () => api.tw.lv.add();
loadUserData();

async function entrarTwitch() {
    const status = (arg) => document.getElementById('msgStatus').innerHTML = `${arg}`;
    let username = document.getElementById('username').value.toLowerCase()
    let pass = document.getElementById('pass').value;
    let error = false;

    let btnEntrar = document.getElementById('btnEntrar');
    btnEntrar.blur();
    status("");

    if (!username.replace(/ /g, '') || !pass.replace(/ /g, '')) {
        status('Por favor preencha os campos Username e OAuth');
        return;
    } else if (username.startsWith(' ') || pass.startsWith(' ') || pass.includes(' ')) {
        if (username.startsWith(' ')) {
            status('Por favor insirá um Username válido');
            return;
        }
    }

    BlockLogin(true)
    btnEntrar.value = '';
    btnEntrar.classList.add('loading');
    btnEntrar.onclick = null;
    status('Iniciando Client');

    client = {
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

    client = tmi.ini(client);

    status('Tentando conectar');

    await tmi.cn().catch(err => {
        error = true;
        BlockLogin(false)
        status(`${err}`);
        btnEntrar.value = 'Entrar';
        btnEntrar.classList.remove('loading');
        btnEntrar.onclick = entrarTwitch;
    })

    if (!error) {
        status('Entrando nos canais...');
        document.querySelector('#UserBox').innerHTML.length == 0 ? createProfile() : false;

        await api.tw.jcnc(err => {
            error = true;
            BlockLogin(false)
            status(`${err}`);
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            tmi.dc();
            client = null;
        });

        if (!error) {
            saveUserData(username, pass)
            api.console.manager()
            api.tw.jp()
            changeButtonSide(btnEntrar, 1)
            status('Entrou nos canais!');
            btnEntrar.value = 'Sair';
            btnEntrar.classList.remove('loading');
            btnEntrar.classList.add('conectado');
            btnEntrar.onclick = sairTwitch;
        }
    }
}

async function sairTwitch() {
    await tmi.dc()
    const getInner = (e, txt) => document.getElementById(e).innerHTML = txt
    const btnEntrar = document.getElementById('btnEntrar');

    changeButtonSide(btnEntrar, 0)
    BlockLogin(false)
    setTimeout(() => {
        getInner('jc_Status', '')
        getInner('msgStatus', '');
        getInner('UserBox', '');
    }, 200)

    client = null;
    btnEntrar.blur();
    btnEntrar.value = 'Entrar';
    btnEntrar.classList.remove('conectado');
    btnEntrar.onclick = entrarTwitch;
}