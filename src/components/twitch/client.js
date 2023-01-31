const supUser = async (user) => { let tmp = await getUser(user); return tmp }
const tmi = api.tw.tmi;
let client = null;
let gCount = () => api.tw.lv.get(), aCount = () => api.tw.lv.add();
loadUserData();

async function entrarTwitch() {
    const status = (arg) => document.getElementById('msgStatus').innerHTML = `${arg}`;
    let username = document.getElementById('username').value.toLowerCase()
    let pass = document.getElementById('pass').value;
    let error = false;
    let localCount = document.querySelector('#cntotal').textContent;

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

        await joinChannels().catch(err => {
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
/*==============================================(ENTRANDO EM CANAIS)===========================================*/

//Ativar/Desativar tempo estimado
function waitLogin(valor) {
    const getEl = (el) => document.querySelector(el)
    const items = ['#Mtotal', '#Ptotal', '[name="clearPing"]', '.sgSom', '#JoinCanalExtra']
    valor == true ? valor = 'hidden' : valor = 'visible';
    valor !== 'visible' ? getEl('#Mtimer').style.display = 'flex' : getEl('#Mtimer').style.display = 'none'
    for (let i = 0; i < items.length; i++) {
        getEl(items[i]).style.visibility = valor
    }
}

//Entrar em canais & Gerênciar fila
async function joinChannels() {
    const getEl = (el) => document.querySelector(el)
    const getText = (el, txt) => el.textContent = `${txt}`
    let channelPath = `${api.app.getPath('userData')}\\Config\\channels.json`
    let totalCN = getEl('#cntotal'), txtArea = getEl('#pTable'), channels = {};
    let y = 0, durantion = 0;

    const ClockTimer = {
        start: (time) => {
            var self = this;
            let minutes, seconds;
            this.intervalo = setInterval(() => {
                minutes = parseInt(time / 60, 10);
                seconds = parseInt(time % 60, 10);
                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;
                getText(getEl('#Mtimer'), `Tempo Estimado 🕘 ${minutes}m ${seconds}s`);
                --time < 0 ? clearInterval(this.intervalo) : false
            }, 1000)
        },
        stop: () => {
            clearInterval(this.intervalo);
            getText(getEl('#Mtimer'), `--:--`);
        }
    }

    console.log('passou aqui')
    if (api.helpers.env() === 'DEV') channelPath = api.path.join('./DevData/channels.json')

    if (!api.fs.exist(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    } else if (JSON.parse(api.fs.rd(channelPath)).length <= 0) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    } else {
        channels = JSON.parse(api.fs.rd(channelPath))
    }
    durantion = channels.length
    console.log(durantion)
    let tmc = await api.tw.tmi.rds();

    while (tmc != 'OPEN') await api.helpers.sleep(1000);

    for (let x = 0; x < channels.length; x++) {
        console.log(`\nAntes: ${channels[x]}`)
        tmi.join(channels[x]).catch(err => {
            if (err === 'msg_channel_suspended') {
                aCount();
                api.helpers.sleep(300).then(() => removeChannel(`${channels[x]}`));
            }
        })
        console.log(`\nDepois: ${channels[x]}`)
        y++
        if (x === 0) {
            getEl('#pTable').value = `\n\n\n🔸Só é possivel se conectar em até 20 Canais em menos de 10 segundos, acima disso a Twitch irá lhe desconectar.\n🔹Sua lista foi coloca em uma fila onde a cada 18 Canais um delay de 10 segundos é aplicado.`;
            changeButtonSide(getEl('#btnEntrar'), 1);
            waitLogin(true)
            ClockTimer.start(durantion)
        }
        getText(totalCN, `🟢 Entrou: ${x + 1}/${channels.length - gCount()}`)
        if (y > 17) {
            getText(totalCN, `🟡 Aguarde: ${x + 1}/${channels.length -
                gCount()}`)
            y = 0;
            await api.helpers.sleep(10.5 * 1000)
        }
        await api.helpers.sleep(200)
    }
    ClockTimer.stop()
    waitLogin(false)
    txtArea.value = "";
    await api.helpers.sleep(200)
    getText(totalCN, `🟣 Canais: ${channels.length - gCount()}`);
}

//Remover canais banidos/suspensos ou inexistente
function removeChannel(chn) {
    let channels = chn.toString()
    let dt = new Date().toLocaleDateString().replaceAll('/', '.')
    let channelPath = `${api.app.getPath('userData')}\\Config\\channels.json`;
    let bkChannels = `${api.app.getPath('desktop')}\\smlurker_lista.backup.${dt}.txt`;
    if (api.helpers.env() === 'DEV') channelPath = api.path.join('./DevData/channels.json')
    if (api.fs.exist(channelPath)) {
        let currentCn = JSON.parse(api.fs.rd(channelPath))
        let errMsg = `O canal ${channels.toUpperCase()} foi removido da sua Lista de Canais\n\tMotivo: Este canal não existe ou foi suspenso.\n\nUm arquivo de backup foi criado em sua área de trabalho!`;
        let onList = false, filtro;

        if (currentCn.includes(channels)) onList = true;
        if (onList) {
            filtro = currentCn.filter(channel => channel !== channels);
            currentCn.sort()
            currentCn = JSON.stringify(currentCn).replace(/[\"\[\]]/g, '')
            api.fs.write(channelPath, JSON.stringify(filtro))
            api.fs.write(bkChannels, currentCn)
            api.dg.showMB({
                type: 'info',
                title: 'Canal Removido — SMLurker',
                message: errMsg,
            });
        }
    }
}

/*===========================================(ENTRANDO/SAINDO DE CANAIS)=======================================*/


/*============================================(GERENCIAMENTO DE DADOS)=========================================*/
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