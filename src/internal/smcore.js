const tmijs = require('tmi.js')
const { ipcRenderer } = require('electron')
const { createConfigs } = require('../components/helpers/setupConfigs')
const { observeIrcNotices } = require('../components/twitch/ircNoticeDiagnostics')
let localClient = null
let n = 0

const smcore = {
    config: {
        create: (path, mentions, subgift) => createConfigs(path, mentions, subgift),
    },
    tmi: {
        ini: (options) => createClient(options),
        client: () => localClient,
        channels: () => localClient?.getChannels() ?? [],
        cn: async () => localClient.connect(),
        dc: async () => localClient.disconnect(),
        rds: async () => localClient.readyState(),
        join: async (chn) => localClient.join(chn),
        part: async (chn) => localClient.part(chn),
        on: async (e, func) => localClient.on(`${e}`, func)
    },
    lv: {
        add: () => { return n += 1 },
        sub: () => { return n -= 1 },
        get: () => { return n },
        reset: () => { return n = 0 },
    },
    jcn: async () => {
        let { jc } = require('../components/twitch/joinchannels')
        jc();
    },
    jcnc: async (channels) => {
        let { jc } = require('../components/twitch/joinchannels')
        return jc(channels)
    },
    jp: async () => {
        let { joinpart } = require('../components/twitch/joinPart')
        joinpart()
    },
    data: {
        createProfile: async (accessToken) => {
            let { createProfile } = require('../components/smdata/coredata')
            return createProfile(accessToken)
        },
        loadUserData: async () => {
            let { loadUserData } = require('../components/smdata/coredata')
            return loadUserData()
        },
        loadNotify: () => {
            let { loadNotify } = require('../components/smdata/coredata')
            loadNotify()
        },
        saveUserData: async (user, pass) => {
            let { saveUserData } = require('../components/smdata/coredata')
            saveUserData(user, pass)
        }
    }
}

function createClient(options) {
    localClient = new tmijs.Client(options)
    observeIrcNotices(localClient, (notice) => {
        ipcRenderer.send('sendtoConsole', `\n${new Date().toLocaleString('pt-BR')} · ${notice}\n`)
    })
    return localClient
}

module.exports = { smcore };
