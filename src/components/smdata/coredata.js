const { appcore } = require('../../internal/appcore')
const { fetchUserProfile } = require('./userProfileSource')
const { ipcRenderer } = require('electron')
/*============================================(GERENCIAMENTO DE DADOS)=========================================*/
//Salvando dados
async function saveUserData(user, pass) {
    return ipcRenderer.invoke('legacy-credentials:save', { username: user, pass })
}

//Carregando dados salvos
async function loadUserData() {
    const getEl = (el) => document.querySelector(el);
    const configPath = `${appcore.appr.getPath('userData')}\\Config\\configs.json`;
    let autoConnect = false;

    if (appcore.fs.exist(configPath)) {
        const config = JSON.parse(appcore.fs.read(configPath, { encoding: 'utf8' }));
        getEl('#swt_notifyMe').checked = config.NotifyMe;
        getEl('#swt_notifyGift').checked = config.NotifyGift;
        autoConnect = config.autologin === true;
    }

    const { credentials, protectionPending } = await ipcRenderer.invoke('legacy-credentials:load');
    if (!credentials) return { hasCredentials: false, autoConnect };
    getEl('#username').value = credentials.username;
    getEl('#pass').value = credentials.pass;
    return { hasCredentials: true, autoConnect, protectionPending };
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

async function loadProfile(username, profilePath, accessToken) {
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
        const updated = await fetchUserProfile(username, fetch, undefined, accessToken);
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
async function getUserProfile(username, accessToken) {
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new TypeError('Nome de usuário da Twitch inválido.');
    }
    const profilePath = `${appcore.appr.getPath('userData')}\\Config\\profile.json`;
    let request = profileRequests.get(username.toLowerCase());
    if (!request) {
        request = loadProfile(username, profilePath, accessToken);
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
    const profileButton = document.getElementById('user_box');
    profileButton.setAttribute('aria-label', tooltip.textContent);
    profileButton.replaceChildren(avatar, tooltip);
}

async function createProfile(accessToken) {
    const username = document.querySelector('#username').value.toString();
    renderProfile('Chatting', 'https://i.imgur.com/pTyMFWw.gif', '#9148FF');

    const profileData = await getUserProfile(username, accessToken);
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
