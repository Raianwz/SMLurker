const tmi = require('tmi.js'), fs = require('fs'), path = require('path');
const { remote: { app, Notification } } = require('electron');
const env = require('../src/components/helpers/env');
const joinChannels = require(path.resolve(__dirname, '../src/components/twitch/joinChannels'));
const CreateConfigs = require(path.resolve(__dirname, '../src/components/helpers/createConfigs'));
const getUser = (user) => { fetch(`https://api.chatwz.ga/api/smlurker/${user}`).then(async (resp) => { const dados = await resp.json(); return userData = dados }) }
let userData = null;
let client = null;
loadCredentials();

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

    if (pass.length < 30 || pass.startsWith(' ') || pass.includes(' ')) {
        status('Por favor insirá um OAoth válido');
        return;
    }

    BlockLogin(true)
    btnEntrar.value = '';
    btnEntrar.classList.add('loading');
    btnEntrar.onclick = null;
    status('Iniciando Client');


    client = new tmi.Client({
        options: { debug: false },
        connection: {
            reconnect: true,
            secure: true,
        },
        identity: {
            username: username,
            password: pass,
        },
        channels: [],
    });

    status('Tentando conectar');

    await client.connect().catch(err => {
        error = true;
        BlockLogin(false)
        status(`${err}`);
        btnEntrar.value = 'Entrar';
        btnEntrar.classList.remove('loading');
        btnEntrar.onclick = entrarTwitch;
    })

    if (!error) {
        status('Entrando nos canais...');


        await joinChannels(client).catch(err => {
            error = true;
            BlockLogin(false)
            status(`${err}`);
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            client.disconnect();
            client = null;
        }).then(() => {
            saveCredentials(username, pass);
            getUser(username);
        });


        if (!error) {
            changeButtonSide(btnEntrar, 1)
            pingMessages(client, username);
            criarUser()
            status('Entrou nos canais!');
            btnEntrar.value = 'Sair';
            btnEntrar.classList.remove('loading');
            btnEntrar.classList.add('conectado');
            btnEntrar.onclick = sairTwitch;

        }
    }
}

async function sairTwitch() {
    await client.disconnect();
    let userbox = document.getElementById('UserBox')
    let btnEntrar = document.getElementById('btnEntrar');
    let status = document.getElementById('msgStatus');
    userbox.innerHTML = "";
    pingMessages(true)
    BlockLogin(false)
    changeButtonSide(btnEntrar, 0)

    client = null;
    btnEntrar.blur();

    status.innerHTML = '';
    btnEntrar.value = 'Entrar';
    btnEntrar.classList.remove('conectado');
    btnEntrar.onclick = entrarTwitch;
}

//Função Salvar Dados
async function saveCredentials(username, pass) {
    let credentialsPath = `${app.getPath('userData')}\\Config\\credentials.json`,
        credentials = {};
    credentials.username = username;
    credentials.pass = pass;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials), null, 2);
}
//Função carregar dados salvos
async function loadCredentials() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`
    const credentialsPath = `${app.getPath('userData')}\\Config\\credentials.json`;
    let credentials;

    if (fs.existsSync(credentialsPath)) {
        credentials = JSON.parse(fs.readFileSync(credentialsPath, { encoding: 'utf8' }));
        getEl('#username').value = credentials.username;
        getEl('#pass').value = credentials.pass;
        getUser(credentials.username)
        if (fs.existsSync(configPath)) {
            let config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
            getEl('#swt_notifyMe').checked = config.NotifyMe
            getEl('#swt_notifyGift').checked = config.NotifyGift
            if (config.autologin === true) {
                getEl('#btnEntrar').click();
            };
        }
    }

}

function criarUser() {
    let userbox = document.getElementById('UserBox')
    let logo = userData.profile_image_url;
    let displayName = userData.display_name;
    userbox.innerHTML = "";
    userbox.innerHTML = `<p>${displayName}</p><img class="avatar" src="${logo}" alt="${displayName}">`
}

function changeButtonSide(btnEntrar, destino) {
    const element = (el) => document.querySelector(el)
    const elDisplay = (el, style) => element(el).style.display = `${style}`
    let conectBox = element('.btnSair'), loginBox = element('.loginBox');
    destino == 1
        ? conectBox.appendChild(btnEntrar)
        : loginBox.appendChild(btnEntrar)
    Notify();
    if (destino == 1) {
        element('.container').style.overflow = 'hidden'
        element('.conectBox').classList.remove('hide')
        element('.mainBox').classList.add('hide')
        setTimeout(() => {
            element('.conectBox').classList.add('show')
            elDisplay('.mainBox', 'none')
            elDisplay('.conectBox', 'flex')
        }, .1 * 1000)
    } else {
        element('.conectBox').classList.remove('show')
        element('.mainBox').classList.remove('hide')
        element('.conectBox').classList.add('hide')
        setTimeout(() => {
            element('.mainBox').classList.add('show')
            elDisplay('.mainBox', 'flex')
            elDisplay('.conectBox', 'none')
        }, .1 * 1000)
        setTimeout(() => {
            element('.container').removeAttribute('style')
        }, .9 * 1000)
    }

}

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
        btnFiles.onclick = loadChannelsFromFile;
    }
}

function pingMessages(clear) {
    const element = (el) => document.querySelector(el)
    const inText = (el, text) => el.innerText = text
    const resetTable = () => { pingTable.value = ""; mentions = 0; inText(pTotal, `💬 Texto: 0/4000`); inText(mTotal, `🔔 Menções: 0`) }
    const DisplayName = userData.display_name, UserName = userData.login;
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    const audio = new Audio('https://cdn.discordapp.com/attachments/743995893665235034/870396181174452224/gift.mp3');
    audio.volume= 0.30

    let dist = process.resourcesPath;
    let distFile = 'assets';
    if (env(app) == 'DEV') { dist = __dirname; distFile = '../src/assets' }

    let pingTable = element('#pTable'), ping;
    let pTotal = element('#Ptotal'), mTotal = element('#Mtotal'), mentions = 0;

    client.on("message", async (channel, tags, message, self) => {
        if (message.includes(UserName) || message.includes(DisplayName)) {
            pingTable.value += `🔴Canal: ${channel}\n💬 ${tags.username}: ${message}\n`;
            ping = pingTable.value
            ping = ping.replaceAll(' ', '').replace('🔴Canal:', '').replace('💬', '').replace('\n', '')
            inText(pTotal, `💬 Texto: ${ping.length}/4000`);
            inText(mTotal, `🔔 Menções: ${mentions += 1}`);
            LoadNotifyMe(channel, tags, message)
        }
        pingTable.value.length > 4000 ? resetTable() : false
    });
    client.on('subgift', async (channel, username, streakMonths, recipient, methods, userstate) => {
        if (recipient.includes(DisplayName) || recipient.includes(UserName)) {
            LoadNotifySub(channel, username, recipient)
        }
    })
    element('.sgSom').addEventListener('click', () => audio.play());
    element('[name="clearPing"]').addEventListener('click', () => resetTable());
    clear == true ? resetTable() : false

    function LoadNotifyMe(channel, tags, message) {
        if (fs.existsSync(configPath)) {
            let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
            if (configs.NotifyMe === true) {
                let mention = path.join(dist, `${distFile}/metion.png`);
                new Notification({
                    icon: mention, title: `Mencionado em ${channel}`,
                    body: `Você foi mencionado em ${channel} por @${tags.username}: ${message}`,
                    timeoutType: 'default', urgency: 'low'
                }).show()
            }
        }
    };

    function LoadNotifySub(channel, username, recipient) {
        if (fs.existsSync(configPath)) {
            let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
            if (configs.NotifyGift === true) {
                let gift = path.join(dist, `${distFile}/gift.png`);
                new Notification({
                    icon: gift, title: `Ganhou um Sub em ${channel}`,
                    body: `Você(@${recipient}) ganhou um SubGift de @${username} em ${channel}`,
                    timeoutType: 'default', urgency: 'normal', sound: audio.play(), silent: true
                }).show()
            }
        }
    };
}

function Notify() {
    const getEl = (el) => document.querySelector(el);
    const mentions = getEl('#swt_notifyMe'), subgift = getEl('#swt_notifyGift');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`
    mentions.addEventListener('click', () => saveConfigs())
    subgift.addEventListener('click', () => saveConfigs())

    function saveConfigs() {
        if (fs.existsSync(configPath)) {
            let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
            configs.NotifyMe = mentions.checked;
            configs.NotifyGift = subgift.checked;
            fs.writeFileSync(configPath, JSON.stringify(configs))
        } else {
            CreateConfigs(configPath, mentions.checked, subgift.checked)
        }
    }
}