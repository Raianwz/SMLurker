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
}

function createClient(options) {
    return localClient = new tmijs.Client(options)
}

module.exports.SCore = smcore;