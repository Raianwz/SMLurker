const { Notification } = require('@electron/remote')
const path = require('path')
const api = require('../../../preload').API
const getEl = (el) => document.querySelector(el)
const barText = (el, txt) => el.innerText = txt;
const profilePath = `${api.app.getPath('userData')}\\Config\\profile.json`;
const configPath = `${api.app.getPath('userData')}\\Config\\configs.json`;
const audio = new Audio('https://cdn.discordapp.com/attachments/743995893665235034/970807861770846278/Chaos.mp3');
let ping, mentions = 0, userdata;
let panel = getEl('#pTable'), pTotal = getEl('#Ptotal'), mTotal = getEl('#Mtotal')
const barReset = () => { panel.value = ""; mentions = 0; barText(pTotal, `💬 Texto: 0/6000`); barText(getEl("#Mtotal"), `🔔 Menções: 0`) }
let dist = process.resourcesPath, distFile = 'assets';
if (api.helpers.env() == 'DEV') { dist = __dirname; distFile = '../../../src/assets' }

function consoleManager() {
    if (api.fs.exist(profilePath)) userdata = JSON.parse(api.fs.rd(profilePath))
    else api.tw.data.createProfile()
    let userDisplayName = userdata.display_name ?? getEl('#username').value.toLowerCase()
    let userName = userdata.login ?? getEl('#username').value.toLowerCase()

    getEl('span.sgSom').addEventListener('click', () => {
        if (localStorage.getItem('volume') !== null) {
            if (localStorage.getItem('volume') < 10) audio.volume = `0.0${localStorage.getItem('volume')}`
            else if (localStorage.getItem('volume') >= 10 && localStorage.getItem('volume') < 100) audio.volume = `0.${localStorage.getItem('volume')}`
            else audio.volume = 1;
        }
        audio.play()
    })

    getEl('span[name=clearPing]').addEventListener('click', barReset)

    if (localStorage.getItem('showGifts') === null) localStorage.setItem('showGifts', false)

    api.tw.tmi.on('message', async (channel, tags, message) => {
        let time = new Date();
        let checkUserName = (message.toLowerCase()).includes(`${userName}`)
        if (checkUserName || message.includes(`${userDisplayName}`)) {
            consoleChange(`\n🔴 Canal: ${channel}\t\t${time.toLocaleTimeString()}\t\t${time.toLocaleDateString()}\n💬 ${tags.username}: ${message}\n`)
            barText(mTotal, `🔔 Menções: ${mentions += 1}`)
            checkNotifyMe(channel, tags, message)
            panel.scrollTop = panel.scrollHeight
        }
    })

    api.tw.tmi.on('subgift', async (channel, username, recipient) => {
        let checkUserName = (message.toLowerCase()).includes(`${userName}`)
        if (checkUserName || recipient.includes(userDisplayName)) {
            checkNotifySub(channel, username, recipient)
        }
        if (localStorage.getItem('showGifts') === true) {
            let time = new Date();
            consoleChange(`\n${time.toLocaleDateString()} 🔎[DEBUG]: @${username} presentou @${recipient} em #${channel}`)
        }
    })

}

function consoleChange(text) {
    panel.value += text;
    ping = panel.value;
    ping = ping.replace(new RegExp(/([🟢,⛔,🔴,💬,—,\s*,\t*]|\b(Canal)|\b([0-9]+)|((\/)|(:)))/gm), '')
    panel.scrollTop = panel.scrollHeight;
    ping.length >= 6000 ? resetTable() : false
    barText(pTotal, `💬 Texto: ${ping.length}/6000`)
}

function checkNotifyMe(channel, tags, message) {
    if (api.fs.exist(configPath)) {
        let configs = JSON.parse(api.fs.rd(configPath))
        if (configs.NotifyMe === true) {
            let mention = path.join(dist, `${distFile}/metion.png`);
            let notifica = new Notification({
                icon: mention,
                title: `Mencionado(a) em ${channel}`,
                body: `@${tags.username} diz: ${message}`,
                timeoutType: 'default', urgency: 'low'
            })
            notifica.addListener('click', () => { api.elcr.shell.openExternal(`https://twitch.tv/${channel.replace('#', '')}`) })
            notifica.show()
        }
    }
}

function checkNotifySub(channel, username, recipient) {
    if (api.fs.exist(configPath)) {
        let configs = JSON.parse(api.fs.rd(configPath))
        if (configs.NotifyGift === true) {
            let gift = path.join(dist, `${distFile}/gift.png`)
            let notifica = new Notification({
                icon: gift, title: `Ganhou um Sub em ${channel}`,
                body: `Você(@${recipient}) ganhou um SubGift de @${username} em ${channel}`,
                timeoutType: 'default', urgency: 'normal', sound: audio.play(), silent: true
            })
            notifica.addListener('click', () => { shell.openExternal(`https://twitch.tv/${channel.replace('#', '')}`) })
            notifica.show()

        }
    }
}

module.exports.barReset = barReset;
module.exports.consoleMng = consoleManager;
module.exports.panel = consoleChange;