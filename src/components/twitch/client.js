const supUser = async (user) => { let tmp = await getUser(user); return tmp }
let client = null;
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

    client = api.tw.tmi.ini(client);

    status('Tentando conectar');

    await api.tw.tmi.cn().catch(err => {
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

        await api.tw.tmi.join('twitch').catch(err => {
            error = true;
            BlockLogin(false)
            status(`${err}`);
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            client.disconnect();
            client = null;
        });

        if (!error) {
            saveUserData(username, pass)
            //JC_JoinPart(client)
            changeButtonSide(btnEntrar, 1)
            //pingMessages(client, username);
            status('Entrou nos canais!');
            btnEntrar.value = 'Sair';
            btnEntrar.classList.remove('loading');
            btnEntrar.classList.add('conectado');
            btnEntrar.onclick = sairTwitch;
        }
    }
}

async function sairTwitch() {
    await api.tw.tmi.dc()
    const getInner = (e, txt) => document.getElementById(e).innerHTML = txt
    const btnEntrar = document.getElementById('btnEntrar');

    changeButtonSide(btnEntrar, 0)
    //pingMessages(true)
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

/*===========================================(GERENCIAMENTO DE DADOS)===========)===============================*/

//Salvando dados
async function saveUserData(user, pass) {
    let dataPath = `${api.app.getPath('userData')}\\Config\\credentials.json`
    let data = {};
    data.username = user
    data.pass = pass
    api.fs.write(dataPath, `${JSON.stringify(data)}`)
}

//Carregando dados salvos
async function loadUserData() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${api.app.getPath('userData')}\\Config\\configs.json`;
    const dataPath = `${api.app.getPath('userData')}\\Config\\credentials.json`
    let data = {};

    if (api.fs.exist(dataPath)) {
        data = JSON.parse(api.fs.read(dataPath, { encoding: 'utf8' }))
        getEl('#username').value = data.username
        getEl('#pass').value = data.pass
        if (api.fs.exist(configPath)) {
            let config = JSON.parse(api.fs.read(configPath, { encoding: 'utf8' }))
        }
    }

}

//Criando Profile data
async function createProfile() {
    const getEl = (el) => document.querySelector(el);
    const userbox = (e) => document.getElementById('UserBox').innerHTML = `${e}`;
    const profilePath = `${api.app.getPath('userData')}\\Config\\profile.json`;
    let profileData, user, exp, checkExp, oldExp;
    userbox(`<p>Just Chatting</p><img class="avatar" style='color:#618e54' src="https://i.imgur.com/pTyMFWw.gif" alt="Chatting">`)
    if (api.fs.exist(profilePath)) {
        profileData = JSON.parse(api.fs.read(profilePath, { encoding: 'utf8' }))
        exp = new Date().toLocaleDateString();
        oldExp = new Date(profileData.expire).toLocaleDateString();
        (exp > oldExp) ? checkExp = true : checkExp = false
    } else {
        user = getEl('#username').value;
        profileData = await getUser(username)
        if (Object.keys(profileData).length > 0) {
            exp = new Date().toLocaleDateString();
            profileData.expire = exp;
            api.fs.write(profilePath, JSON.stringify(profileData))
        }
    }
    let logo = profileData != null ? profileData.profile_image_url : 'https://i.imgur.com/pTyMFWw.gif';
    let displayName = profileData != null ? profileData.display_name : getEl('#username').value.toLowerCase();
    let userColor = profileData != null ? profileData.chatColor : '#9148FF';
    userbox("");
    userbox(`<p>${displayName}</p><img class="avatar" style='color:${userColor}' src="${logo}" alt="${displayName}">`)
    
    if (checkExp) {
        profileData.expire = new Date().toLocaleDateString()
        api.fs.write(profilePath, JSON.stringify(profileData))
    }
}

//Chamando API's
async function getUser(user) {
    const smapi = await fetch(`https://apichatwz.vercel.app/smlurker/${user}/`)
    const ivr = await fetch(`https://api.ivr.fi/twitch/resolve/${user}/`)
    let udata = {};
    if (smapi.ok || ivr.ok) {
        if (smapi == 200) udata = await smapi.json()
        else {
            udata = await ivr.json()
            udata = {
                "id": udata.id, "login": udata.login, "display_name": udata.displayName, "chatColor": udata.chatColor, "profile_image_url": udata.logo
            }
        }
    }
    return udata
}

/*===========================================(ANIMAÇÃO DE TRANSIÇÃO)===========================================*/

//Desativar inputs e botões durante a mudança de telas
function BlockLogin(valor) {
    const items = ['#username', '#pass', '#txtCanal', 'input[type="button"].add', 'input[type="button"].remove'];
    let btnFiles = document.querySelector('.cnFile');
    for (let i = 0; i < items.length; i++) {
        document.querySelector(items[i]).disabled = valor
    }
    if (valor == true) {
        btnFiles.classList.add('block')
        btnFiles.onclick = null;
    } else {
        btnFiles.classList.remove('block')
        btnFiles.onclick = console.log('click')//loadChannelsFromFile;
    }
}

//Transição entre Tela Login e Tela Principal
function changeButtonSide(btnEntrar, destino) {
    const el = (el) => document.querySelector(el)
    const elDisplay = (ele, style) => el(ele).style.display = `${style}`
    const rmClass = (ele, Class) => el(`${ele}`).classList.remove(`${Class}`);
    const addClass = (ele, Class) => el(`${ele}`).classList.add(`${Class}`);
    let conectBox = el('.btnSair'), loginBox = el('.loginBox');
    destino == 1 ? conectBox.appendChild(btnEntrar) : loginBox.appendChild(btnEntrar)
    //Notify();
    if (destino == 1) {
        addClass('.mainBox', 'hide');
        setTimeout(() => { addClass('.conectBox', 'show'); elDisplay('.mainBox', 'none'); elDisplay('.conectBox', 'flex'); }, .1 * 1000)
    } else {
        rmClass('.conectBox', 'show'); rmClass('.mainBox', 'hide'); addClass('.conectBox', 'hide');
        setTimeout(() => { addClass('.mainBox', 'show'); elDisplay('.mainBox', 'flex'); elDisplay('.conectBox', 'none'); }, .1 * 1000)
    }
}