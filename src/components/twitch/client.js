const tmi = api.tw.tmi;
const changeButtonSide = (btn, dest) => api.tr.changeside(btn, dest);
const BlockLogin = (value) => api.tr.blockinput(value);
const joinChannels = async () => api.tw.jcn();
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

        await tmi.join('pabot').catch(err => {
            error = true;
            BlockLogin(false)
            status(`${err}`);
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            tmi.dc();
            client = null;
        });
        // await joinChannels().catch(err => {
        //     error = true;
        //     BlockLogin(false)
        //     status(`${err}`);
        //     btnEntrar.value = 'Entrar';
        //     btnEntrar.classList.remove('loading');
        //     btnEntrar.onclick = entrarTwitch;
        //     tmi.dc();
        //     client = null;
        // });

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
            console.log(gCount())
        }
    }
}

async function sairTwitch() {
    await tmi.dc()
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

/*===========================================(ENTRANDO/SAINDO DE CANAIS)=======================================*/

/*============================================(GERENCIAMENTO DE DADOS)=========================================*/
// //Salvando dados
// async function saveUserData(user, pass) {
//     let dataPath = `${api.app.getPath('userData')}\\Config\\credentials.json`
//     let data = {};
//     data.username = user
//     data.pass = pass
//     api.fs.write(dataPath, `${JSON.stringify(data)}`)
// }

// //Carregando dados salvos
// async function loadUserData() {
//     const getEl = (el) => document.querySelector(el);
//     const configPath = `${api.app.getPath('userData')}\\Config\\configs.json`;
//     const dataPath = `${api.app.getPath('userData')}\\Config\\credentials.json`
//     let data = {};

//     if (api.fs.exist(dataPath)) {
//         data = JSON.parse(api.fs.read(dataPath, { encoding: 'utf8' }))
//         getEl('#username').value = data.username
//         getEl('#pass').value = data.pass
//         if (api.fs.exist(configPath)) {
//             let config = JSON.parse(api.fs.read(configPath, { encoding: 'utf8' }))
//         }
//     }

// }

// //Criando Profile data
// async function createProfile() {
//     const getEl = (el) => document.querySelector(el);
//     const userbox = (e) => document.getElementById('UserBox').innerHTML = `${e}`;
//     const profilePath = `${api.app.getPath('userData')}\\Config\\profile.json`;
//     let profileData, user, exp, checkExp, oldExp;
//     userbox(`<p>Just Chatting</p><img class="avatar" style='color:#618e54' src="https://i.imgur.com/pTyMFWw.gif" alt="Chatting">`)
//     if (api.fs.exist(profilePath)) {
//         profileData = JSON.parse(api.fs.read(profilePath, { encoding: 'utf8' }))
//         if (Object.keys(profileData).length < 5) {
//             profileData = await getUser(username)
//             profileData.expire = new Date().toLocaleDateString();
//             api.fs.write(profilePath, JSON.stringify(profileData));
//         }
//         exp = new Date().toLocaleDateString();
//         oldExp = new Date(profileData.expire).toLocaleDateString();
//         (exp > oldExp) ? checkExp = true : checkExp = false
//     } else {
//         user = getEl('#username').value;
//         profileData = await getUser(username)
//         if (Object.keys(profileData).length > 0) {
//             exp = new Date().toLocaleDateString();
//             profileData.expire = exp;
//             api.fs.write(profilePath, JSON.stringify(profileData))
//         }
//     }
//     let logo = profileData != null ? profileData.profile_image_url : 'https://i.imgur.com/pTyMFWw.gif';
//     let displayName = profileData != null ? profileData.display_name : getEl('#username').value.toLowerCase();
//     let userColor = profileData != null ? profileData.chatColor : '#9148FF';
//     userbox("");
//     userbox(`<p>${displayName}</p><img class="avatar" style='color:${userColor}' src="${logo}" alt="${displayName}">`)

//     if (checkExp) {
//         profileData.expire = new Date().toLocaleDateString()
//         api.fs.write(profilePath, JSON.stringify(profileData))
//     }
// }

// //Chamando API's

// async function getUser(user) {
//     const smapi = await fetch(`https://apichatwz.vercel.app/smlurker/${user}/`)
//     let udata = {};
//     if (smapi.ok || mapi == 20) {
//         udata = await smapi.json()
//         console.log(udata)
//     } else {
//         udata = {
//             "id": 0, "login": udata.login, "display_name": `${user.toLowerCase()}`, "chatColor": '#9148FF', "profile_image_url": 'https://i.imgur.com/3TRjKcn.gif'
//         }
//     }
//     return udata
// }