const { appcore } = require('../../internal/appcore')
const { fetchUserProfile } = require('./userProfileSource')
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
    let autoConnect = false;

    if (appcore.fs.exist(configPath)) {
        const config = JSON.parse(appcore.fs.read(configPath, { encoding: 'utf8' }));
        getEl('#swt_notifyMe').checked = config.NotifyMe;
        getEl('#swt_notifyGift').checked = config.NotifyGift;
        autoConnect = config.autologin === true;
    }

    if (appcore.fs.exist(dataPath)) {
        data = JSON.parse(appcore.fs.read(dataPath, { encoding: 'utf8' }))
        if (typeof data.username !== 'string' || typeof data.pass !== 'string' || !data.username.trim() || !data.pass.trim()) return { hasCredentials: false, autoConnect };
        getEl('#username').value = data.username
        getEl('#pass').value = data.pass
        return { hasCredentials: true, autoConnect };
    }
    return { hasCredentials: false, autoConnect };
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

const profileRequests = new Map();
const PROFILE_CACHE_MS = 24 * 60 * 60 * 1000;

function profileCacheTime(value) {
    if (typeof value !== 'string') return NaN;
    const legacyDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (legacyDate) {
        const [, day, month, year] = legacyDate.map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 ? date.getTime() : NaN;
    }
    return Date.parse(value);
}

function validProfile(profile, username) {
    return profile && profile.login?.toLowerCase() === username.toLowerCase() &&
        typeof profile.display_name === 'string' && typeof profile.profile_image_url === 'string';
}

async function loadProfile(username, profilePath) {
    let cached = null;
    try {
        if (appcore.fs.exist(profilePath)) cached = JSON.parse(appcore.fs.read(profilePath, { encoding: 'utf8' }));
    } catch { /* Um cache danificado pode ser substituído pela próxima consulta. */ }

    const matchingCache = validProfile(cached, username) ? cached : null;
    const cachedAt = profileCacheTime(matchingCache?.expire);
    if (Number.isFinite(cachedAt) && cachedAt <= Date.now() && Date.now() - cachedAt < PROFILE_CACHE_MS) {
        return matchingCache;
    }

    try {
        const updated = await fetchUserProfile(username);
        if (!validProfile(updated, username)) throw new Error('Perfil incompleto');
        if (matchingCache?.chatColor && matchingCache.chatColor !== '#9148FF') {
            updated.chatColor = matchingCache.chatColor;
        }
        if (updated.stale === true) return updated;
        updated.expire = new Date().toISOString();
        appcore.fs.write(profilePath, JSON.stringify(updated));
        return updated;
    } catch {
        return matchingCache;
    }
}

// Consulta compartilhada pela interface e pelo perfil visual.
async function getUserProfile(username) {
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new TypeError('Nome de usuário da Twitch inválido.');
    }
    const profilePath = `${appcore.appr.getPath('userData')}\\Config\\profile.json`;
    let request = profileRequests.get(username.toLowerCase());
    if (!request) {
        request = loadProfile(username, profilePath);
        profileRequests.set(username.toLowerCase(), request);
        request.then(
            () => profileRequests.delete(username.toLowerCase()),
            () => profileRequests.delete(username.toLowerCase()),
        );
    }
    return request;
}

//Criando Profile data
function safeProfileImageUrl(value) {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
            ? url.href : 'https://i.imgur.com/pTyMFWw.gif';
    } catch {
        return 'https://i.imgur.com/pTyMFWw.gif';
    }
}

function renderProfile(displayName, logo, userColor) {
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.title = displayName;
    avatar.alt = displayName;
    avatar.src = logo;
    avatar.style.color = userColor;
    const tooltip = document.createElement('p');
    tooltip.className = 'mb-tooltip';
    tooltip.textContent = `Perfil de ${displayName}`;
    document.getElementById('user_box').replaceChildren(avatar, tooltip);
}

async function createProfile() {
    const username = document.querySelector('#username').value.toString();
    renderProfile('Chatting', 'https://i.imgur.com/pTyMFWw.gif', '#618e54');

    const profileData = await getUserProfile(username);
    let logo = safeProfileImageUrl(profileData?.profile_image_url);
    let displayName = profileData != null ? profileData.display_name : username.toLowerCase();
    let userColor = /^#[0-9a-fA-F]{6}$/.test(profileData?.chatColor) ? profileData.chatColor : '#9148FF';
    renderProfile(displayName, logo, userColor);
    return { displayName, logo, userColor };
}

module.exports.saveUserData = saveUserData;
module.exports.createProfile = createProfile;
module.exports.getUserProfile = getUserProfile;
module.exports.loadUserData = loadUserData;
module.exports.loadNotify = loadNotify;
