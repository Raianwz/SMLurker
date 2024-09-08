const { appcore } = require('../../internal/appcore')
/*============================================(GERENCIAMENTO DE DADOS)=========================================*/
//Salvando dados
async function saveUserData(user, pass) {
    let dataPath = `${appcore.appr.getPath('userData')}\\Config\\credentials.json`
    let data = {};
    data.username = user
    data.pass = pass
    appcore.fs.write(dataPath, `${JSON.stringify(data)}`)
}

//Carregando dados salvos
async function loadUserData() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${appcore.appr.getPath('userData')}\\Config\\configs.json`;
    const dataPath = `${appcore.appr.getPath('userData')}\\Config\\credentials.json`
    let data = {};

    if (appcore.fs.exist(dataPath)) {
        data = JSON.parse(appcore.fs.read(dataPath, { encoding: 'utf8' }))
        getEl('#username').value = data.username
        getEl('#pass').value = data.pass
        if (appcore.fs.exist(configPath)) {
            let config = JSON.parse(appcore.fs.read(configPath, { encoding: 'utf8' }))
            getEl('#swt_notifyMe').checked = config.NotifyMe
            getEl('#swt_notifyGift').checked = config.NotifyGift
            config.autologin === true ? getEl('#btnEntrar').click() : false
        }
    }

}

//Gerenciando dados de Configurações de Notificações
async function loadNotify() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${appcore.appr.getPath('userData')}\\Config\\configs.json`;
    const mentions = getEl('#swt_notifyMe'), subgift = getEl('#swt_notifyGift');
    if (appcore.fs.exist(configPath)) {
        let config = JSON.parse(appcore.fs.read(configPath, { encoding: 'utf8' }))
        config.NotifyMe = mentions.checked;
        config.NotifyGift = subgift.checked;
        giftVol(subgift.checked)
        appcore.fs.write(configPath, JSON.stringify(config));
    } else {
        appcore.tw.config.create(configPath, mentions.checked, subgift.checked)
    }
}

function giftVol(chk) {
    const getEl = (el) => document.querySelector(el);
    if (chk === true) {
        getEl('#volBox').style.display = 'flex'
        getEl('span.sgSom').style.display = 'flex'
    }
    else {
        getEl('#volBox').style.display = 'none'
        getEl('span.sgSom').style.display = 'none'
    }
}

//Criando Profile data
async function createProfile() {
    const userbox = (e) => document.getElementById('UserBox').innerHTML = `${e}`;
    const btnuser = (e) => document.getElementById('user_box').innerHTML = `${e}`;
    const profilePath = `${appcore.appr.getPath('userData')}\\Config\\profile.json`;
    let profileData, exp, checkExp, oldExp, legacyColor;
    let username = document.querySelector('#username').value.toString();
    userbox(`<p>Just Chatting</p><img class="avatar" style='color:#618e54' src="https://i.imgur.com/pTyMFWw.gif" alt="Chatting">`)
    btnuser(`<p class="mb-tooltip">Perfil</p><img class="avatar" style='color:#618e54' src="https://i.imgur.com/pTyMFWw.gif" alt="Chatting">`)

    if (appcore.fs.exist(profilePath)) {
        profileData = JSON.parse(appcore.fs.read(profilePath, { encoding: 'utf8' }))

        if (Object.keys(profileData).length < 5) {
            profileData = await getUser(username)
            profileData.expire = new Date().toLocaleDateString();
            appcore.fs.write(profilePath, JSON.stringify(profileData));
        }

        exp = new Date();
        oldExp = new Date(profileData.expire);
        (exp.toDateString() !== oldExp.toDateString()) ? checkExp = true : checkExp = false
    } else {
        profileData = await getUser(username)
        if (Object.keys(profileData).length > 0) {
            exp = new Date().toISOString();
            profileData.expire = exp;
            appcore.fs.write(profilePath, JSON.stringify(profileData))
        }
    }
    let logo = profileData != null ? profileData.profile_image_url : 'https://i.imgur.com/pTyMFWw.gif';
    let displayName = profileData != null ? profileData.display_name : username.toLowerCase();
    let userColor = profileData != null ? profileData.chatColor : '#9148FF';
    userbox("");
    btnuser("");
    userbox(`<p>${displayName}</p><img class="avatar" style='color:${userColor}' src="${logo}" alt="${displayName}">`)
    btnuser(`<p class="mb-tooltip">Perfil de ${displayName}</p><img title="${displayName}" class="avatar" style='color:${userColor}' src="${logo}" alt="${displayName}">`)

    if (checkExp) {
        legacyColor = profileData.chatColor
        profileData = await getUser(username)
        if (legacyColor != '#9148FF') profileData.chatColor = legacyColor
        profileData.expire = new Date().toISOString()
        appcore.fs.write(profilePath, JSON.stringify(profileData))
    }
}

//Chamando API's
async function getUser(user) {
    const wzapi = await fetch(`https://api.chat.raianwz.com.br/smlurker/${user}/`)
    let udata = {};
    if (wzapi.ok) {
        udata = await wzapi.json()
    } else if (!wzapi.ok) {
        const smapi = await fetch(`https://apichatwz.vercel.app/smlurker/${user}/`)
        udata = await smapi.json()
    }
    else {
        udata = {
            "id": 0, "login": udata.login, "display_name": `${user.toLowerCase()}`, "chatColor": '#9148FF', "profile_image_url": 'https://i.imgur.com/3TRjKcn.gif'
        }
    }
    return udata
}

module.exports.saveUserData = saveUserData;
module.exports.createProfile = createProfile;
module.exports.loadUserData = loadUserData;
module.exports.loadNotify = loadNotify;