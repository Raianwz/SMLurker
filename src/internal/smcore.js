const tmijs = require('tmi.js')
const { createConfigs } = require('../components/helpers/setupConfigs')
let localClient = null
let localtmi = tmijs.Client({});
let n = 0;

const smcore = {
    config: {
        create: (path, mentions, subgift) => createConfigs(path, mentions, subgift),
    },
    tmi: {
        ini: (options) => createClient(options),
        client: () => localClient,
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
    jp: async () => {
        let { joinpart } = require('../components/twitch/joinPart')
        joinpart()
    },
    data: {
        createProfile: () => {
            let { createProfile } = require('../components/smdata/coredata')
            createProfile()
        },
        loadUserData: async () => {
            let { loadUserData } = require('../components/smdata/coredata')
            loadUserData()
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
    return localClient = new tmijs.Client(options)
}

module.exports.SCore = smcore;