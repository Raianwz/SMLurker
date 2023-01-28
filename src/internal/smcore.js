const tmijs = require('tmi.js')
const { createConfigs } = require('../components/helpers/setupConfigs')
let localClient = null
let localtmi = tmijs.Client({});

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
        part: async (chn) => localClient.part(chn, self),
        on: async (e, func) => localClient.on(`${e}`, func)
    },
}

function createClient(options) {
    return localClient = new tmijs.Client(options)
}

module.exports.SCore = smcore;