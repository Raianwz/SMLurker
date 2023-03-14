const { API } = require('../../../preload')
const api = API

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
            getEl('#swt_notifyMe').checked = config.NotifyMe
            getEl('#swt_notifyGift').checked = config.NotifyGift
            config.autologin === true ? getEl('#btnEntrar').click() : false
            console.log(`AutoLogin:\t${config.autologin}`)
        }
    }

}

//Gerenciando dados de Configurações de Notificações
async function loadNotify() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${api.app.getPath('userData')}\\Config\\configs.json`;
    const mentions = getEl('#swt_notifyMe'), subgift = getEl('#swt_notifyGift');
    if (api.fs.exist(configPath)) {
        let config = JSON.parse(api.fs.read(configPath, { encoding: 'utf8' }))
        config.NotifyMe = mentions.checked;
        config.NotifyGift = subgift.checked;
        giftVol(subgift.checked)
        api.fs.write(configPath, JSON.stringify(config));
    } else {
        api.tw.config.create(configPath, mentions.checked, subgift.checked)
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
    const profilePath = `${api.app.getPath('userData')}\\Config\\profile.json`;
    let profileData, exp, checkExp, oldExp, legacyColor;
    let username = document.querySelector('#username').value.toString();
    userbox(`<p>Just Chatting</p><img class="avatar" style='color:#618e54' src="https://i.imgur.com/pTyMFWw.gif" alt="Chatting">`)

    if (api.fs.exist(profilePath)) {
        profileData = JSON.parse(api.fs.read(profilePath, { encoding: 'utf8' }))

        if (Object.keys(profileData).length < 5) {
            profileData = await getUser(username)
            profileData.expire = new Date().toLocaleDateString();
            api.fs.write(profilePath, JSON.stringify(profileData));
        }

        exp = new Date();
        oldExp = new Date(profileData.expire);
        (exp.toDateString() !== oldExp.toDateString()) ? checkExp = true : checkExp = false
    } else {
        profileData = await getUser(username)
        if (Object.keys(profileData).length > 0) {
            exp = new Date().toISOString();
            profileData.expire = exp;
            api.fs.write(profilePath, JSON.stringify(profileData))
        }
    }
    let logo = profileData != null ? profileData.profile_image_url : 'https://i.imgur.com/pTyMFWw.gif';
    let displayName = profileData != null ? profileData.display_name : username.toLowerCase();
    let userColor = profileData != null ? profileData.chatColor : '#9148FF';
    userbox("");
    userbox(`<p>${displayName}</p><img class="avatar" style='color:${userColor}' src="${logo}" alt="${displayName}">`)

    if (checkExp) {
        legacyColor = profileData.chatColor
        profileData = await getUser(username)
        if (legacyColor != '#9148FF') profileData.chatColor = legacyColor
        profileData.expire = new Date().toISOString()
        api.fs.write(profilePath, JSON.stringify(profileData))
    }
}

//Chamando API's
async function getUser(user) {
    const smapi = await fetch(`https://apichatwz.vercel.app/smlurker/${user}/`)
    let udata = {};
    if (smapi.ok || mapi == 20) {
        udata = await smapi.json()
    } else {
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