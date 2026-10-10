const { Notification, app } = require('@electron/remote')
const { ipcRenderer } = require('electron');
const { appcore } = require('../../internal/appcore')
const { assetPath } = require('../helpers/assets')
const getEl = (el) => document.querySelector(el)
const profilePath = `${appcore.appr.getPath('userData')}\\Config\\profile.json`;
const configPath = `${appcore.appr.getPath('userData')}\\Config\\configs.json`;
const audio = new Audio(new URL('../assets/Chaos.ogg', document.baseURI).href);
let jcConsolePanel = getEl('#jcConsole');
const jcConsoleReset = () => { jcConsolePanel.value = "" }


async function consoleManager() {
    let userdata = {};
    try {
        if (appcore.fs.exist(profilePath)) userdata = JSON.parse(appcore.fs.rd(profilePath));
        else {
            const profile = await appcore.sc.data.createProfile();
            userdata.display_name = profile?.displayName;
        }
    } catch { /* A conexão aos canais não depende da foto do perfil. */ }
    let userDisplayName = userdata.display_name ?? getEl('#username').value.toLowerCase()
    let userName = userdata.login ?? getEl('#username').value.toLowerCase()
    let volBar = getEl('#volBar');

    volBar.addEventListener('input', changeBar);
    volBar.addEventListener('click', changeBar);
    volBar.click()

    getEl('span.sgSom').addEventListener('click', () => {
        if (localStorage.getItem('volume') !== null) {
            if (localStorage.getItem('volume') < 10) audio.volume = `0.0${localStorage.getItem('volume')}`
            else if (localStorage.getItem('volume') >= 10 && localStorage.getItem('volume') < 100) audio.volume = `0.${localStorage.getItem('volume')}`
            else audio.volume = 1;
        }
        audio.play()
    })

    getEl('span[name=jc_clean]').addEventListener('click', jcConsoleReset)

    function changeBar() {
        const value = this.value;
        const percentage = (value - this.min) / (this.max - this.min) * 100;
        this.style.background = `linear-gradient(to right, #683AAE ${percentage}%, white ${percentage}%)`;
    }

    if (localStorage.getItem('showGifts') === null) localStorage.setItem('showGifts', false)

    appcore.sc.tmi.on('message', async (channel, tags, message) => {
        let time = new Date();
        let checkUserName = (message.toLowerCase()).includes(`${userName}`)
        if (checkUserName || message.includes(`${userDisplayName}`)) {
            ipcRenderer.send('sendMentionstoConsole', `\n🔴 Canal: ${channel}\t\t${time.toLocaleTimeString()}\t\t${time.toLocaleDateString()}\n💬 ${tags.username}: ${message}\n`)
            checkNotifyMe(channel, tags, message)
        }
    })

    appcore.sc.tmi.on('subgift', async (channel, username, recipient, userstate) => {
        if (userstate.includes(userName) || userstate.includes(userDisplayName)) {
            checkNotifySub(channel, username, userstate)
        }
        if (localStorage.getItem('showGifts') === 'true') {
            let time = new Date();
            ipcRenderer.send('sendtoConsole', `\n${time.toLocaleDateString()} ${time.toLocaleTimeString()} 🔎[DEBUG]: 🎁 @${username} presentou  @${userstate} em ${channel}`)
            console.log('%c🔎[DEBUG]', 'color:green', ` @${username} presentou  @${userstate} em ${channel}`);
        }
    })


}


function jcConsoleChange(text) {
    jcConsolePanel.value += text;
    ping = jcConsolePanel.value;
    ping = ping.replace(new RegExp(/([🟢,⛔,🔴,💬,—,\s*,\t*]|\b(Canal)|\b(\[DEBUG\])|\b([0-9]+)|((\/)|(:)))/gm), '')
    jcConsolePanel.scrollTop = jcConsolePanel.scrollHeight;
    ping.length >= 2000 ? jcConsoleReset() : false
}

function checkNotifyMe(channel, tags, message) {
    if (appcore.fs.exist(configPath)) {
        let configs = JSON.parse(appcore.fs.rd(configPath))
        if (configs.NotifyMe === true) {
            let mention = assetPath(app, 'metion.png');
            let notifica = new Notification({
                icon: mention,
                title: `Mencionado(a) em ${channel}`,
                body: `@${tags.username} diz: ${message}`,
                timeoutType: 'default', urgency: 'low'
            })
            notifica.addListener('click', () => { appcore.eshell.openExternal(`https://twitch.tv/${channel.replace('#', '')}`) })
            notifica.show()
        }
    }
}

function checkNotifySub(channel, username, recipient) {
    if (appcore.fs.exist(configPath)) {
        let configs = JSON.parse(appcore.fs.rd(configPath))
        if (configs.NotifyGift === true) {
            let gift = assetPath(app, 'gift.png')
            let notifica = new Notification({
                icon: gift, title: `Ganhou um Sub em ${channel}`,
                body: `Você(@${recipient}) ganhou um SubGift de @${username} em ${channel}`,
                timeoutType: 'default', urgency: 'normal', sound: audio.play(), silent: true
            })
            notifica.addListener('click', () => { appcore.eshell.openExternal(`https://twitch.tv/${channel.replace('#', '')}`) })
            notifica.show()

        }
    }
}

module.exports.consoleMng = consoleManager;
module.exports.jcPanel = jcConsoleChange;
module.exports.jcPNReset = jcConsoleReset;
